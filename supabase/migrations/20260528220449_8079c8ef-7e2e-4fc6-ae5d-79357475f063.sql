
ALTER TABLE public.conceptos_liquidacion
  ADD COLUMN IF NOT EXISTS cobrado_at timestamptz,
  ADD COLUMN IF NOT EXISTS pago_id uuid;

CREATE INDEX IF NOT EXISTS idx_conceptos_pago_id ON public.conceptos_liquidacion(pago_id);

-- Reemplaza anular_pago para liberar también los conceptos imputados a ese pago
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

  -- Liberar conceptos imputados a este pago
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

  RETURN jsonb_build_object(
    'ok', true,
    'liquidacion_id', _liq.id,
    'total_cobrado', _nuevo_total,
    'pendiente', _nuevo_pend,
    'estado', _nuevo_estado
  );
END;
$function$;
