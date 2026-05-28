
-- 1. Snapshot de modalidad en liquidaciones
ALTER TABLE public.liquidaciones
  ADD COLUMN IF NOT EXISTS destino_cobro text NOT NULL DEFAULT 'Inmobiliaria';

-- 2. Tipo de pago
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'cobranza';

-- 3. Tabla de cobros de comisión al propietario
CREATE TABLE IF NOT EXISTS public.cobros_comision_propietario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id uuid NOT NULL UNIQUE,
  propietario_id uuid,
  monto_comision numeric NOT NULL DEFAULT 0,
  iva_comision numeric NOT NULL DEFAULT 0,
  monto_gastos_reintegro numeric NOT NULL DEFAULT 0,
  total_cobrar numeric NOT NULL DEFAULT 0,
  fecha_cobro date,
  medio medio_pago,
  referencia text NOT NULL DEFAULT '',
  comprobante_url text,
  estado text NOT NULL DEFAULT 'Pendiente',
  observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobros_comision_propietario TO authenticated;
GRANT ALL ON public.cobros_comision_propietario TO service_role;

ALTER TABLE public.cobros_comision_propietario ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccp_auth_select ON public.cobros_comision_propietario FOR SELECT TO authenticated USING (true);
CREATE POLICY ccp_auth_ins ON public.cobros_comision_propietario FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY ccp_auth_upd ON public.cobros_comision_propietario FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY ccp_admin_del ON public.cobros_comision_propietario FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ccp_updated_at
BEFORE UPDATE ON public.cobros_comision_propietario
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Trigger: al pasar liquidación a Cobrada en modalidad Propietario, crear cobro pendiente
CREATE OR REPLACE FUNCTION public.crear_cobro_comision_si_corresponde()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ct public.contratos%ROWTYPE;
  _iva numeric;
BEGIN
  IF NEW.estado = 'Cobrada' AND NEW.destino_cobro = 'Propietario'
     AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM NEW.estado) THEN

    SELECT * INTO _ct FROM public.contratos WHERE id = NEW.contrato_id;
    SELECT COALESCE(SUM(iva_comision),0) INTO _iva
      FROM public.pagos WHERE liquidacion_id = NEW.id AND estado = 'Confirmado';

    INSERT INTO public.cobros_comision_propietario
      (liquidacion_id, propietario_id, monto_comision, iva_comision,
       monto_gastos_reintegro, total_cobrar, estado)
    VALUES
      (NEW.id, _ct.propietario_id, NEW.comision_inmobiliaria, _iva,
       0, NEW.comision_inmobiliaria + _iva, 'Pendiente')
    ON CONFLICT (liquidacion_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_liq_crear_cobro_comision ON public.liquidaciones;
CREATE TRIGGER trg_liq_crear_cobro_comision
AFTER INSERT OR UPDATE OF estado ON public.liquidaciones
FOR EACH ROW EXECUTE FUNCTION public.crear_cobro_comision_si_corresponde();

-- 5. RPC: confirmar cobro de comisión
CREATE OR REPLACE FUNCTION public.confirmar_cobro_comision(
  _cobro_id uuid,
  _fecha date,
  _medio medio_pago,
  _referencia text,
  _comprobante_url text DEFAULT NULL,
  _observaciones text DEFAULT '',
  _monto_gastos_reintegro numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c public.cobros_comision_propietario%ROWTYPE;
  _liq public.liquidaciones%ROWTYPE;
  _total numeric;
  _gastos numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT * INTO _c FROM public.cobros_comision_propietario WHERE id = _cobro_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cobro de comisión no encontrado'; END IF;
  IF _c.estado = 'Cobrada' THEN RAISE EXCEPTION 'El cobro ya fue confirmado'; END IF;

  SELECT * INTO _liq FROM public.liquidaciones WHERE id = _c.liquidacion_id FOR UPDATE;

  _gastos := COALESCE(_monto_gastos_reintegro, _c.monto_gastos_reintegro);
  _total := _c.monto_comision + _c.iva_comision + _gastos;

  UPDATE public.cobros_comision_propietario
     SET estado = 'Cobrada',
         fecha_cobro = _fecha,
         medio = _medio,
         referencia = COALESCE(_referencia,''),
         comprobante_url = _comprobante_url,
         observaciones = COALESCE(_observaciones,''),
         monto_gastos_reintegro = _gastos,
         total_cobrar = _total
   WHERE id = _cobro_id;

  UPDATE public.liquidaciones SET estado = 'Transferida' WHERE id = _c.liquidacion_id;

  INSERT INTO public.eventos_contrato
    (contrato_id, liquidacion_id, periodo, fecha, tipo, categoria, descripcion, monto)
  VALUES (_liq.contrato_id, _liq.id, _liq.periodo, _fecha,
    'comision_cobrada', 'financiero',
    'Comisión cobrada al propietario por ' || _medio ||
      COALESCE(' (ref: ' || NULLIF(_referencia,'') || ')',''),
    _total);

  RETURN jsonb_build_object('ok', true, 'total', _total);
END;
$$;

-- 6. Guard: rendir_propietario y marcar_acreditada solo en modalidad Inmobiliaria
CREATE OR REPLACE FUNCTION public.rendir_propietario(_liquidacion_id uuid, _fecha_transferencia date, _medio medio_pago, _referencia text, _comprobante_url text DEFAULT NULL::text, _observaciones text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _liq public.liquidaciones%ROWTYPE;
  _rend_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO _liq FROM public.liquidaciones WHERE id = _liquidacion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Liquidación no encontrada'; END IF;
  IF _liq.destino_cobro = 'Propietario' THEN
    RAISE EXCEPTION 'Esta liquidación es modalidad "Cobra el propietario": no aplica rendición';
  END IF;
  IF _liq.estado <> 'Acreditada' THEN
    RAISE EXCEPTION 'La liquidación debe estar Acreditada antes de rendir';
  END IF;

  UPDATE public.rendiciones_propietario
     SET fecha_transferencia=_fecha_transferencia, medio=_medio, referencia=_referencia,
         comprobante_url=_comprobante_url, observaciones=_observaciones, estado='Transferida'
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
$function$;

CREATE OR REPLACE FUNCTION public.marcar_acreditada(_liquidacion_id uuid, _fecha_acreditacion date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _liq public.liquidaciones%ROWTYPE;
  _ct  public.contratos%ROWTYPE;
  _iva numeric;
  _neto numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO _liq FROM public.liquidaciones WHERE id = _liquidacion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Liquidación no encontrada'; END IF;
  IF _liq.destino_cobro = 'Propietario' THEN
    RAISE EXCEPTION 'Esta liquidación es modalidad "Cobra el propietario": no requiere acreditación';
  END IF;
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
$function$;

-- 7. anular_pago: si la liq deja de estar Cobrada, borrar cobro pendiente asociado
CREATE OR REPLACE FUNCTION public.anular_pago(_pago_id uuid, _motivo text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _pago         public.pagos%ROWTYPE;
  _liq          public.liquidaciones%ROWTYPE;
  _antes_liq    jsonb;
  _antes_pago   jsonb;
  _nuevo_total  numeric;
  _nuevo_pend   numeric;
  _nuevo_estado estado_liquidacion;
  _uid          uuid := auth.uid();
  _email        text := COALESCE((SELECT email FROM auth.users WHERE id = _uid),'');
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT * INTO _pago FROM public.pagos WHERE id = _pago_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pago no encontrado'; END IF;
  IF _pago.estado = 'Anulado' THEN RAISE EXCEPTION 'El pago ya está anulado'; END IF;

  SELECT * INTO _liq FROM public.liquidaciones WHERE id = _pago.liquidacion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Liquidación no encontrada'; END IF;

  _antes_pago := to_jsonb(_pago);
  _antes_liq  := to_jsonb(_liq);

  UPDATE public.pagos
     SET estado = 'Anulado',
         observaciones = COALESCE(observaciones,'') ||
           CASE WHEN _motivo <> '' THEN E'\n[Anulado] ' || _motivo ELSE E'\n[Anulado]' END
   WHERE id = _pago_id;

  UPDATE public.conceptos_liquidacion
     SET cobrado_at = NULL, pago_id = NULL
   WHERE pago_id = _pago_id;

  SELECT COALESCE(SUM(monto),0) INTO _nuevo_total
    FROM public.pagos
   WHERE liquidacion_id = _liq.id AND estado = 'Confirmado';

  _nuevo_pend := _liq.total_cobrar - _nuevo_total;

  IF _nuevo_total <= 0 THEN
    _nuevo_estado := 'Pendiente';
  ELSIF _nuevo_total < _liq.total_cobrar THEN
    _nuevo_estado := 'Parcial';
  ELSE
    _nuevo_estado := _liq.estado;
  END IF;

  UPDATE public.liquidaciones
     SET total_cobrado = _nuevo_total,
         pendiente     = _nuevo_pend,
         estado        = _nuevo_estado
   WHERE id = _liq.id;

  -- Si la liq deja de estar Cobrada y hay cobro pendiente, borrarlo
  IF _nuevo_estado <> 'Cobrada' AND _liq.destino_cobro = 'Propietario' THEN
    DELETE FROM public.cobros_comision_propietario
     WHERE liquidacion_id = _liq.id AND estado = 'Pendiente';
  END IF;

  INSERT INTO public.eventos_contrato
    (contrato_id, liquidacion_id, periodo, fecha, tipo, categoria, descripcion, monto)
  VALUES (
    _pago.contrato_id, _liq.id, _liq.periodo, CURRENT_DATE,
    'pago_anulado', 'financiero',
    'Pago anulado' || CASE WHEN _motivo <> '' THEN ': ' || _motivo ELSE '' END,
    _pago.monto
  );

  INSERT INTO public.auditoria
    (user_id, user_email, accion, entidad, entidad_id, descripcion, datos_antes, datos_despues, monto)
  VALUES (
    _uid, _email, 'anular', 'pago', _pago_id,
    'Anulación de pago' || CASE WHEN _motivo <> '' THEN ' — ' || _motivo ELSE '' END,
    jsonb_build_object('pago', _antes_pago, 'liquidacion', _antes_liq),
    jsonb_build_object(
      'liquidacion', jsonb_build_object(
        'total_cobrado', _nuevo_total,
        'pendiente',     _nuevo_pend,
        'estado',        _nuevo_estado
      )
    ),
    _pago.monto
  );

  RETURN jsonb_build_object('ok', true, 'liquidacion_id', _liq.id,
    'total_cobrado', _nuevo_total, 'pendiente', _nuevo_pend, 'estado', _nuevo_estado);
END;
$function$;
