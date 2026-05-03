
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE tipo_garantia AS ENUM ('Propietaria','Garante','Seguro_Caucion','Recibo_Sueldo','Otro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_garantia AS ENUM ('Vigente','Vencida','Reemplazada','Anulada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE respuesta_renovacion AS ENUM ('Pendiente','Acepta','Rechaza');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE resultado_renovacion AS ENUM ('Pendiente','Renovado','No_Renovado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ CONTRATOS: rescisión ============
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS permite_rescision_anticipada boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS multa_rescision_porcentaje numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multa_rescision_observaciones text NOT NULL DEFAULT '';

-- Permitir 'Rescindido' en estado_contrato si no existe
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel='Rescindido'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname='estado_contrato')
  ) THEN
    ALTER TYPE estado_contrato ADD VALUE 'Rescindido';
  END IF;
END $$;

-- ============ GARANTIAS ============
CREATE TABLE IF NOT EXISTS public.garantias_contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  tipo tipo_garantia NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  persona_id uuid REFERENCES public.personas(id) ON DELETE SET NULL,
  monto_cobertura numeric,
  aseguradora text NOT NULL DEFAULT '',
  numero_poliza text NOT NULL DEFAULT '',
  empleador text NOT NULL DEFAULT '',
  fecha_emision date,
  fecha_vencimiento date,
  documento_url text,
  estado estado_garantia NOT NULL DEFAULT 'Vigente',
  observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_garantias_contrato ON public.garantias_contrato(contrato_id);
CREATE INDEX IF NOT EXISTS idx_garantias_venc ON public.garantias_contrato(fecha_vencimiento) WHERE estado='Vigente';

ALTER TABLE public.garantias_contrato ENABLE ROW LEVEL SECURITY;
CREATE POLICY garantias_auth_select ON public.garantias_contrato FOR SELECT TO authenticated USING (true);
CREATE POLICY garantias_auth_ins ON public.garantias_contrato FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY garantias_auth_upd ON public.garantias_contrato FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY garantias_auth_del ON public.garantias_contrato FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_garantias_updated BEFORE UPDATE ON public.garantias_contrato
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bucket privado para documentos de garantía
INSERT INTO storage.buckets (id, name, public) VALUES ('garantias','garantias', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "garantias_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='garantias');
CREATE POLICY "garantias_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='garantias');
CREATE POLICY "garantias_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='garantias');
CREATE POLICY "garantias_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='garantias');

-- Función para marcar garantías vencidas
CREATE OR REPLACE FUNCTION public.marcar_garantias_vencidas()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.garantias_contrato
     SET estado='Vencida'
   WHERE estado='Vigente'
     AND fecha_vencimiento IS NOT NULL
     AND fecha_vencimiento < CURRENT_DATE;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;

-- ============ RESCISIONES ============
CREATE TABLE IF NOT EXISTS public.rescisiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  fecha_efectiva date NOT NULL,
  motivo text NOT NULL DEFAULT '',
  meses_restantes integer NOT NULL DEFAULT 0,
  valor_restante numeric NOT NULL DEFAULT 0,
  multa_porcentaje numeric NOT NULL DEFAULT 0,
  multa_monto numeric NOT NULL DEFAULT 0,
  liquidacion_multa_id uuid REFERENCES public.liquidaciones(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rescisiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY rescisiones_auth_select ON public.rescisiones FOR SELECT TO authenticated USING (true);
CREATE POLICY rescisiones_auth_ins ON public.rescisiones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY rescisiones_auth_upd ON public.rescisiones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY rescisiones_auth_del ON public.rescisiones FOR DELETE TO authenticated USING (true);

-- Función rescindir_contrato
CREATE OR REPLACE FUNCTION public.rescindir_contrato(
  _contrato_id uuid,
  _fecha_efectiva date,
  _motivo text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _c public.contratos%ROWTYPE;
  _meses_rest integer;
  _valor_rest numeric;
  _multa numeric;
  _liq_id uuid;
  _resc_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO _c FROM public.contratos WHERE id=_contrato_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato no encontrado'; END IF;
  IF _c.estado <> 'Activo' THEN RAISE EXCEPTION 'Solo se pueden rescindir contratos activos'; END IF;

  _meses_rest := GREATEST(0, ((EXTRACT(YEAR FROM age(_c.fecha_fin, _fecha_efectiva))*12
                              + EXTRACT(MONTH FROM age(_c.fecha_fin, _fecha_efectiva))))::integer);
  _valor_rest := _meses_rest * _c.alquiler_base;
  _multa := round(_valor_rest * (_c.multa_rescision_porcentaje/100.0), 2);

  IF _multa > 0 THEN
    INSERT INTO public.liquidaciones
      (contrato_id, periodo, periodo_label, fecha_emision, estado, subtotal, total_cobrar, pendiente, moneda, observaciones)
    VALUES (_c.id, to_char(_fecha_efectiva,'YYYY-MM'), 'Multa rescisión',
      _fecha_efectiva, 'Pendiente', _multa, _multa, _multa, _c.moneda,
      'Multa por rescisión anticipada')
    RETURNING id INTO _liq_id;

    INSERT INTO public.conceptos_liquidacion (liquidacion_id, concepto, monto, responsable, aplica_al_inquilino)
    VALUES (_liq_id, 'Multa por rescisión anticipada', _multa, 'Inquilino', true);
  END IF;

  INSERT INTO public.rescisiones
    (contrato_id, fecha_efectiva, motivo, meses_restantes, valor_restante,
     multa_porcentaje, multa_monto, liquidacion_multa_id)
  VALUES (_c.id, _fecha_efectiva, _motivo, _meses_rest, _valor_rest,
          _c.multa_rescision_porcentaje, _multa, _liq_id)
  RETURNING id INTO _resc_id;

  UPDATE public.contratos
     SET estado='Rescindido', fecha_fin=_fecha_efectiva
   WHERE id=_c.id;

  IF _c.propiedad_id IS NOT NULL THEN
    UPDATE public.propiedades
       SET estado='Vacante', contrato_activo_id=NULL
     WHERE id=_c.propiedad_id;
  END IF;

  INSERT INTO public.eventos_contrato
    (contrato_id, fecha, tipo, categoria, descripcion, monto)
  VALUES (_c.id, _fecha_efectiva, 'rescision', 'contractual',
    'Rescisión anticipada' || CASE WHEN _motivo<>'' THEN ': '||_motivo ELSE '' END, _multa);

  RETURN jsonb_build_object('ok', true, 'rescision_id', _resc_id,
    'meses_restantes', _meses_rest, 'multa_monto', _multa, 'liquidacion_id', _liq_id);
END $$;

-- ============ RENOVACIONES ============
CREATE TABLE IF NOT EXISTS public.renovaciones_contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  fecha_consulta date NOT NULL DEFAULT CURRENT_DATE,
  respuesta_propietario respuesta_renovacion NOT NULL DEFAULT 'Pendiente',
  respuesta_inquilino respuesta_renovacion NOT NULL DEFAULT 'Pendiente',
  fecha_respuesta_propietario date,
  fecha_respuesta_inquilino date,
  resultado resultado_renovacion NOT NULL DEFAULT 'Pendiente',
  contrato_nuevo_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_renov_contrato ON public.renovaciones_contrato(contrato_id);
ALTER TABLE public.renovaciones_contrato ENABLE ROW LEVEL SECURITY;
CREATE POLICY renov_auth_select ON public.renovaciones_contrato FOR SELECT TO authenticated USING (true);
CREATE POLICY renov_auth_ins ON public.renovaciones_contrato FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY renov_auth_upd ON public.renovaciones_contrato FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY renov_auth_del ON public.renovaciones_contrato FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_renov_updated BEFORE UPDATE ON public.renovaciones_contrato
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
