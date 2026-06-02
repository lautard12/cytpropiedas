-- ─────────────────────────────────────────────────────────────
-- 1. Extender conceptos_liquidacion
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.conceptos_liquidacion
  ADD COLUMN IF NOT EXISTS pagado_por text NOT NULL DEFAULT 'Pendiente',
  ADD COLUMN IF NOT EXISTS tipo_impacto text NOT NULL DEFAULT 'cobrar_al_inquilino',
  ADD COLUMN IF NOT EXISTS periodo_impacto text NOT NULL DEFAULT 'Actual',
  ADD COLUMN IF NOT EXISTS comprobante_url text,
  ADD COLUMN IF NOT EXISTS observaciones text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS concepto_relacionado_id uuid REFERENCES public.conceptos_liquidacion(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Migración de datos: convertir montos negativos en reintegros con monto positivo
UPDATE public.conceptos_liquidacion
   SET monto = ABS(monto),
       tipo_impacto = 'reintegrar_al_inquilino'
 WHERE monto < 0;

-- Derivar tipo_impacto a partir del aplica_al_inquilino existente para los que quedaron en default
UPDATE public.conceptos_liquidacion
   SET tipo_impacto = CASE
        WHEN aplica_al_inquilino THEN 'cobrar_al_inquilino'
        ELSE 'descontar_al_propietario'
       END
 WHERE tipo_impacto = 'cobrar_al_inquilino'
   AND NOT aplica_al_inquilino;

-- Constraints
ALTER TABLE public.conceptos_liquidacion
  DROP CONSTRAINT IF EXISTS conceptos_liquidacion_monto_positivo,
  ADD  CONSTRAINT conceptos_liquidacion_monto_positivo CHECK (monto >= 0);

ALTER TABLE public.conceptos_liquidacion
  DROP CONSTRAINT IF EXISTS conceptos_liquidacion_tipo_impacto_chk,
  ADD  CONSTRAINT conceptos_liquidacion_tipo_impacto_chk CHECK (
    tipo_impacto IN (
      'cobrar_al_inquilino',
      'descontar_al_propietario',
      'reintegrar_al_inquilino',
      'reintegrar_al_propietario',
      'informativo'
    )
  );

ALTER TABLE public.conceptos_liquidacion
  DROP CONSTRAINT IF EXISTS conceptos_liquidacion_pagado_por_chk,
  ADD  CONSTRAINT conceptos_liquidacion_pagado_por_chk CHECK (
    pagado_por IN ('Inquilino','Propietario','Inmobiliaria','Pendiente')
  );

ALTER TABLE public.conceptos_liquidacion
  DROP CONSTRAINT IF EXISTS conceptos_liquidacion_periodo_impacto_chk,
  ADD  CONSTRAINT conceptos_liquidacion_periodo_impacto_chk CHECK (
    periodo_impacto IN ('Actual','ProximoPeriodo')
  );

-- Trigger: derivar aplica_al_inquilino desde tipo_impacto y updated_at
CREATE OR REPLACE FUNCTION public.conceptos_liquidacion_before_iu()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.aplica_al_inquilino := NEW.tipo_impacto IN ('cobrar_al_inquilino','reintegrar_al_inquilino','reintegrar_al_propietario');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conceptos_liquidacion_before_iu ON public.conceptos_liquidacion;
CREATE TRIGGER trg_conceptos_liquidacion_before_iu
BEFORE INSERT OR UPDATE ON public.conceptos_liquidacion
FOR EACH ROW EXECUTE FUNCTION public.conceptos_liquidacion_before_iu();

-- ─────────────────────────────────────────────────────────────
-- 2. Tabla conceptos_pendientes_contrato
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conceptos_pendientes_contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  origen_concepto_id uuid REFERENCES public.conceptos_liquidacion(id) ON DELETE SET NULL,
  origen_liquidacion_id uuid REFERENCES public.liquidaciones(id) ON DELETE SET NULL,
  concepto text NOT NULL,
  monto numeric NOT NULL DEFAULT 0 CHECK (monto >= 0),
  tipo_impacto text NOT NULL DEFAULT 'reintegrar_al_inquilino',
  pagado_por text NOT NULL DEFAULT 'Pendiente',
  observaciones text NOT NULL DEFAULT '',
  comprobante_url text,
  estado text NOT NULL DEFAULT 'Pendiente',
  liquidacion_aplicada_id uuid REFERENCES public.liquidaciones(id) ON DELETE SET NULL,
  fecha_aplicacion date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cpc_estado_chk CHECK (estado IN ('Pendiente','Aplicado','Anulado')),
  CONSTRAINT cpc_tipo_impacto_chk CHECK (tipo_impacto IN (
    'cobrar_al_inquilino','descontar_al_propietario',
    'reintegrar_al_inquilino','reintegrar_al_propietario','informativo'
  )),
  CONSTRAINT cpc_pagado_por_chk CHECK (pagado_por IN ('Inquilino','Propietario','Inmobiliaria','Pendiente'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conceptos_pendientes_contrato TO authenticated;
GRANT ALL ON public.conceptos_pendientes_contrato TO service_role;

ALTER TABLE public.conceptos_pendientes_contrato ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cpc_auth_select ON public.conceptos_pendientes_contrato;
CREATE POLICY cpc_auth_select ON public.conceptos_pendientes_contrato
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS cpc_auth_ins ON public.conceptos_pendientes_contrato;
CREATE POLICY cpc_auth_ins ON public.conceptos_pendientes_contrato
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS cpc_auth_upd ON public.conceptos_pendientes_contrato;
CREATE POLICY cpc_auth_upd ON public.conceptos_pendientes_contrato
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cpc_admin_del ON public.conceptos_pendientes_contrato;
CREATE POLICY cpc_admin_del ON public.conceptos_pendientes_contrato
  FOR DELETE TO authenticated USING (true);

DROP TRIGGER IF EXISTS trg_cpc_updated_at ON public.conceptos_pendientes_contrato;
CREATE TRIGGER trg_cpc_updated_at
BEFORE UPDATE ON public.conceptos_pendientes_contrato
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. Función recalcular_liquidacion
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recalcular_liquidacion(_liquidacion_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _liq public.liquidaciones%ROWTYPE;
  _ct  public.contratos%ROWTYPE;
  _subtotal_inq numeric := 0;
  _reint_inq numeric := 0;
  _reint_prop numeric := 0;
  _gastos_desc numeric := 0;
  _total_bruto numeric := 0;
  _total_cobrar numeric := 0;
  _saldo_favor numeric := 0;
  _total_cobrado numeric := 0;
  _pendiente numeric := 0;
  _nuevo_estado estado_liquidacion;
BEGIN
  SELECT * INTO _liq FROM public.liquidaciones WHERE id = _liquidacion_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'no encontrada'); END IF;

  SELECT * INTO _ct FROM public.contratos WHERE id = _liq.contrato_id;

  -- Sumas por tipo_impacto, solo conceptos del período Actual
  SELECT COALESCE(SUM(monto) FILTER (WHERE tipo_impacto = 'cobrar_al_inquilino'),0),
         COALESCE(SUM(monto) FILTER (WHERE tipo_impacto = 'reintegrar_al_inquilino'),0),
         COALESCE(SUM(monto) FILTER (WHERE tipo_impacto = 'reintegrar_al_propietario'),0),
         -- Gastos descontables: descontar_al_propietario MENOS los que están compensados por un reintegrar_al_inquilino vinculado
         COALESCE(SUM(c.monto) FILTER (
           WHERE c.tipo_impacto = 'descontar_al_propietario'
             AND NOT EXISTS (
               SELECT 1 FROM public.conceptos_liquidacion r
               WHERE r.concepto_relacionado_id = c.id
                 AND r.tipo_impacto = 'reintegrar_al_inquilino'
             )
         ),0)
    INTO _subtotal_inq, _reint_inq, _reint_prop, _gastos_desc
    FROM public.conceptos_liquidacion c
   WHERE c.liquidacion_id = _liquidacion_id
     AND (c.periodo_impacto IS NULL OR c.periodo_impacto = 'Actual');

  _total_bruto := _subtotal_inq - _reint_inq - _reint_prop + COALESCE(_liq.saldo_anterior,0);
  _total_cobrar := GREATEST(0, _total_bruto);
  _saldo_favor := GREATEST(0, -_total_bruto);

  SELECT COALESCE(SUM(monto),0) INTO _total_cobrado
    FROM public.pagos
   WHERE liquidacion_id = _liquidacion_id AND estado = 'Confirmado';

  _pendiente := GREATEST(0, _total_cobrar - _total_cobrado);

  -- Estado: solo se ajusta entre Pendiente/Parcial/Cobrada
  IF _liq.estado IN ('Pendiente','Parcial','Cobrada') THEN
    IF _total_cobrado <= 0 THEN
      _nuevo_estado := 'Pendiente';
    ELSIF _total_cobrado < _total_cobrar THEN
      _nuevo_estado := 'Parcial';
    ELSE
      _nuevo_estado := 'Cobrada';
    END IF;
  ELSE
    _nuevo_estado := _liq.estado;
  END IF;

  UPDATE public.liquidaciones
     SET subtotal = _subtotal_inq,
         total_cobrar = _total_cobrar,
         total_cobrado = _total_cobrado,
         pendiente = _pendiente,
         estado = _nuevo_estado
   WHERE id = _liquidacion_id;

  -- Si hay saldo a favor del inquilino, generar pendiente si no existe ya
  IF _saldo_favor > 0 THEN
    INSERT INTO public.conceptos_pendientes_contrato
      (contrato_id, origen_liquidacion_id, concepto, monto, tipo_impacto, pagado_por, observaciones)
    SELECT _liq.contrato_id, _liquidacion_id,
           'Saldo a favor del inquilino — período ' || _liq.periodo,
           _saldo_favor, 'reintegrar_al_inquilino', 'Pendiente',
           'Saldo arrastrado del período ' || _liq.periodo
     WHERE NOT EXISTS (
       SELECT 1 FROM public.conceptos_pendientes_contrato
        WHERE origen_liquidacion_id = _liquidacion_id
          AND tipo_impacto = 'reintegrar_al_inquilino'
          AND estado = 'Pendiente'
     );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'subtotal_inquilino', _subtotal_inq,
    'reintegros_al_inquilino', _reint_inq + _reint_prop,
    'gastos_propietario_descontables', _gastos_desc,
    'gastos_propietario_a_reintegrar', _reint_prop,
    'total_cobrar', _total_cobrar,
    'saldo_a_favor_inquilino', _saldo_favor,
    'total_cobrado', _total_cobrado,
    'pendiente', _pendiente
  );
END;
$$;

-- Trigger para recalcular cuando cambian conceptos
CREATE OR REPLACE FUNCTION public.trg_recalcular_liquidacion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalcular_liquidacion(OLD.liquidacion_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalcular_liquidacion(NEW.liquidacion_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_conceptos_after_iud ON public.conceptos_liquidacion;
CREATE TRIGGER trg_conceptos_after_iud
AFTER INSERT OR UPDATE OR DELETE ON public.conceptos_liquidacion
FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_liquidacion();