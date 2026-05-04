
-- 1) Nuevo valor en enum estado_liquidacion
ALTER TYPE estado_liquidacion ADD VALUE IF NOT EXISTS 'Acreditada' BEFORE 'Transferida';

-- 2) Campos de mora en contratos
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS tasa_mora_diaria numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dias_gracia_mora integer NOT NULL DEFAULT 0;

-- 3) Campos de facturación en pagos
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS genera_factura boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_factura text,
  ADD COLUMN IF NOT EXISTS numero_factura text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS iva_comision numeric NOT NULL DEFAULT 0;

-- 4) Tabla rendiciones_propietario
CREATE TABLE IF NOT EXISTS public.rendiciones_propietario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id uuid NOT NULL,
  propietario_id uuid,
  fecha_acreditacion date NOT NULL DEFAULT CURRENT_DATE,
  fecha_transferencia date,
  monto_neto numeric NOT NULL DEFAULT 0,
  comision_retenida numeric NOT NULL DEFAULT 0,
  iva_retenido numeric NOT NULL DEFAULT 0,
  medio medio_pago NOT NULL DEFAULT 'Transferencia',
  referencia text NOT NULL DEFAULT '',
  comprobante_url text,
  observaciones text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'Acreditada', -- 'Acreditada' | 'Transferida'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rendiciones_propietario ENABLE ROW LEVEL SECURITY;

CREATE POLICY rend_auth_select ON public.rendiciones_propietario
  FOR SELECT TO authenticated USING (true);
CREATE POLICY rend_admin_ins ON public.rendiciones_propietario
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY rend_admin_upd ON public.rendiciones_propietario
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY rend_admin_del ON public.rendiciones_propietario
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_rend_set_updated_at
  BEFORE UPDATE ON public.rendiciones_propietario
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Bucket privado para comprobantes de rendición
INSERT INTO storage.buckets (id, name, public)
VALUES ('rendiciones','rendiciones', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Rendiciones lectura autenticados"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rendiciones');
CREATE POLICY "Rendiciones insert admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rendiciones' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Rendiciones update admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'rendiciones' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Rendiciones delete admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'rendiciones' AND has_role(auth.uid(),'admin'::app_role));

-- 6) Función: calcular punitorio (interés compuesto diario sobre pendiente)
CREATE OR REPLACE FUNCTION public.calcular_punitorio(_liquidacion_id uuid, _fecha date DEFAULT CURRENT_DATE)
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _liq public.liquidaciones%ROWTYPE;
  _ct  public.contratos%ROWTYPE;
  _venc date;
  _dias int;
  _interes numeric;
BEGIN
  SELECT * INTO _liq FROM public.liquidaciones WHERE id = _liquidacion_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF _liq.pendiente <= 0 THEN RETURN 0; END IF;

  SELECT * INTO _ct FROM public.contratos WHERE id = _liq.contrato_id;
  IF NOT FOUND OR _ct.tasa_mora_diaria <= 0 THEN RETURN 0; END IF;

  -- Vencimiento = primer día del período + dia_vencimiento + dias_gracia
  _venc := (to_date(_liq.periodo || '-01','YYYY-MM-DD')
            + (_ct.dia_vencimiento - 1) * INTERVAL '1 day'
            + _ct.dias_gracia_mora * INTERVAL '1 day')::date;

  _dias := GREATEST(0, (_fecha - _venc));
  IF _dias = 0 THEN RETURN 0; END IF;

  _interes := _liq.pendiente * (power(1 + _ct.tasa_mora_diaria/100.0, _dias) - 1);
  RETURN ROUND(_interes, 2);
END;
$$;

-- 7) Función: aplicar punitorios al día de hoy
CREATE OR REPLACE FUNCTION public.aplicar_punitorios(_liquidacion_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _liq public.liquidaciones%ROWTYPE;
  _monto numeric;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO _liq FROM public.liquidaciones WHERE id = _liquidacion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Liquidación no encontrada'; END IF;

  _monto := public.calcular_punitorio(_liquidacion_id, CURRENT_DATE);
  IF _monto <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'monto', 0, 'mensaje','Sin mora aplicable');
  END IF;

  INSERT INTO public.conceptos_liquidacion
    (liquidacion_id, concepto, monto, responsable, aplica_al_inquilino)
  VALUES
    (_liquidacion_id, 'Punitorios por mora ' || to_char(CURRENT_DATE,'DD/MM/YYYY'),
     _monto, 'Inquilino', true);

  UPDATE public.liquidaciones
     SET subtotal = subtotal + _monto,
         total_cobrar = total_cobrar + _monto,
         pendiente = pendiente + _monto
   WHERE id = _liquidacion_id;

  INSERT INTO public.eventos_contrato
    (contrato_id, liquidacion_id, periodo, fecha, tipo, categoria, descripcion, monto)
  VALUES (_liq.contrato_id, _liquidacion_id, _liq.periodo, CURRENT_DATE,
    'punitorio_aplicado','financiero','Aplicación de punitorios por mora', _monto);

  RETURN jsonb_build_object('ok', true, 'monto', _monto);
END;
$$;

-- 8) Función: marcar liquidación como Acreditada
CREATE OR REPLACE FUNCTION public.marcar_acreditada(_liquidacion_id uuid, _fecha_acreditacion date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _liq public.liquidaciones%ROWTYPE;
  _ct  public.contratos%ROWTYPE;
  _iva numeric;
  _neto numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO _liq FROM public.liquidaciones WHERE id = _liquidacion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Liquidación no encontrada'; END IF;
  IF _liq.estado NOT IN ('Cobrada') THEN
    RAISE EXCEPTION 'Solo se pueden acreditar liquidaciones en estado Cobrada';
  END IF;

  SELECT * INTO _ct FROM public.contratos WHERE id = _liq.contrato_id;

  SELECT COALESCE(SUM(iva_comision),0) INTO _iva
    FROM public.pagos WHERE liquidacion_id=_liquidacion_id AND estado='Confirmado';

  _neto := _liq.total_cobrado - _liq.comision_inmobiliaria - _iva;

  UPDATE public.liquidaciones SET estado='Acreditada', neto_propietario=_neto
   WHERE id=_liquidacion_id;

  INSERT INTO public.rendiciones_propietario
    (liquidacion_id, propietario_id, fecha_acreditacion, monto_neto,
     comision_retenida, iva_retenido, estado)
  VALUES (_liquidacion_id, _ct.propietario_id, _fecha_acreditacion,
          _neto, _liq.comision_inmobiliaria, _iva, 'Acreditada');

  INSERT INTO public.eventos_contrato
    (contrato_id, liquidacion_id, periodo, fecha, tipo, categoria, descripcion, monto)
  VALUES (_liq.contrato_id, _liquidacion_id, _liq.periodo, _fecha_acreditacion,
    'acreditada','financiero','Fondos acreditados, pendiente de rendir', _neto);

  RETURN jsonb_build_object('ok', true, 'neto', _neto, 'iva', _iva);
END;
$$;

-- 9) Función: rendir al propietario
CREATE OR REPLACE FUNCTION public.rendir_propietario(
  _liquidacion_id uuid,
  _fecha_transferencia date,
  _medio medio_pago,
  _referencia text,
  _comprobante_url text DEFAULT NULL,
  _observaciones text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _liq public.liquidaciones%ROWTYPE;
  _rend_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO _liq FROM public.liquidaciones WHERE id = _liquidacion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Liquidación no encontrada'; END IF;
  IF _liq.estado <> 'Acreditada' THEN
    RAISE EXCEPTION 'La liquidación debe estar Acreditada antes de rendir';
  END IF;

  UPDATE public.rendiciones_propietario
     SET fecha_transferencia=_fecha_transferencia,
         medio=_medio,
         referencia=_referencia,
         comprobante_url=_comprobante_url,
         observaciones=_observaciones,
         estado='Transferida'
   WHERE liquidacion_id=_liquidacion_id
  RETURNING id INTO _rend_id;

  UPDATE public.liquidaciones SET estado='Transferida' WHERE id=_liquidacion_id;

  INSERT INTO public.eventos_contrato
    (contrato_id, liquidacion_id, periodo, fecha, tipo, categoria, descripcion, monto)
  VALUES (_liq.contrato_id, _liquidacion_id, _liq.periodo, _fecha_transferencia,
    'rendida','financiero',
    'Rendición al propietario por ' || _medio || COALESCE(' (ref: '||NULLIF(_referencia,'')||')',''),
    _liq.neto_propietario);

  RETURN jsonb_build_object('ok', true, 'rendicion_id', _rend_id);
END;
$$;
