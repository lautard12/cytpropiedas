
-- 1) Medios de pago pactados y destino del cobro en contratos
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS medios_pago_aceptados text[] NOT NULL DEFAULT ARRAY['Transferencia','Efectivo']::text[],
  ADD COLUMN IF NOT EXISTS destino_cobro text NOT NULL DEFAULT 'Inmobiliaria';

-- 2) Tabla consultas_mora
CREATE TABLE IF NOT EXISTS public.consultas_mora (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id uuid NOT NULL,
  contrato_id uuid NOT NULL,
  fecha_consulta date NOT NULL DEFAULT CURRENT_DATE,
  monto_estimado numeric NOT NULL DEFAULT 0,
  dias_atraso int NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'Pendiente',
  fecha_respuesta date,
  observaciones text NOT NULL DEFAULT '',
  decidido_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consultas_mora ENABLE ROW LEVEL SECURITY;

CREATE POLICY consultas_mora_auth_select ON public.consultas_mora
  FOR SELECT TO authenticated USING (true);
CREATE POLICY consultas_mora_auth_ins ON public.consultas_mora
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY consultas_mora_auth_upd ON public.consultas_mora
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY consultas_mora_admin_del ON public.consultas_mora
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_consultas_mora_updated
  BEFORE UPDATE ON public.consultas_mora
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS consultas_mora_liq_idx ON public.consultas_mora(liquidacion_id);

-- 3) Funciones
CREATE OR REPLACE FUNCTION public.solicitar_autorizacion_mora(_liquidacion_id uuid, _observaciones text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _liq public.liquidaciones%ROWTYPE;
  _ct public.contratos%ROWTYPE;
  _venc date;
  _dias int;
  _monto numeric;
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO _liq FROM public.liquidaciones WHERE id = _liquidacion_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Liquidación no encontrada'; END IF;
  IF EXISTS (SELECT 1 FROM public.consultas_mora WHERE liquidacion_id = _liquidacion_id AND estado = 'Pendiente') THEN
    RAISE EXCEPTION 'Ya existe una consulta pendiente para esta liquidación';
  END IF;
  SELECT * INTO _ct FROM public.contratos WHERE id = _liq.contrato_id;

  _venc := (to_date(_liq.periodo || '-01','YYYY-MM-DD')
            + (_ct.dia_vencimiento - 1) * INTERVAL '1 day'
            + COALESCE(_ct.dias_gracia_mora,0) * INTERVAL '1 day')::date;
  _dias := GREATEST(0, (CURRENT_DATE - _venc));
  _monto := public.calcular_punitorio(_liquidacion_id, CURRENT_DATE);

  INSERT INTO public.consultas_mora
    (liquidacion_id, contrato_id, monto_estimado, dias_atraso, observaciones)
  VALUES (_liquidacion_id, _liq.contrato_id, _monto, _dias, COALESCE(_observaciones,''))
  RETURNING id INTO _id;

  INSERT INTO public.eventos_contrato
    (contrato_id, liquidacion_id, periodo, fecha, tipo, categoria, descripcion, monto)
  VALUES (_liq.contrato_id, _liquidacion_id, _liq.periodo, CURRENT_DATE,
    'consulta_mora','financiero',
    'Consulta al propietario por mora — ' || _dias || ' días de atraso', _monto);

  RETURN jsonb_build_object('ok', true, 'consulta_id', _id, 'monto', _monto, 'dias', _dias);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolver_consulta_mora(_consulta_id uuid, _aprobada boolean, _observaciones text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _c public.consultas_mora%ROWTYPE;
  _liq public.liquidaciones%ROWTYPE;
  _resultado jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO _c FROM public.consultas_mora WHERE id = _consulta_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulta no encontrada'; END IF;
  IF _c.estado <> 'Pendiente' THEN RAISE EXCEPTION 'La consulta ya fue resuelta'; END IF;

  SELECT * INTO _liq FROM public.liquidaciones WHERE id = _c.liquidacion_id;

  UPDATE public.consultas_mora
     SET estado = CASE WHEN _aprobada THEN 'Aprobada' ELSE 'Rechazada' END,
         fecha_respuesta = CURRENT_DATE,
         observaciones = COALESCE(observaciones,'') || CASE WHEN _observaciones <> '' THEN E'\n' || _observaciones ELSE '' END,
         decidido_por = auth.uid()
   WHERE id = _consulta_id;

  IF _aprobada THEN
    _resultado := public.aplicar_punitorios(_c.liquidacion_id);
    INSERT INTO public.eventos_contrato
      (contrato_id, liquidacion_id, periodo, fecha, tipo, categoria, descripcion, monto)
    VALUES (_c.contrato_id, _c.liquidacion_id, _liq.periodo, CURRENT_DATE,
      'mora_aprobada','financiero',
      'Propietario aprobó la aplicación de punitorios' ||
        CASE WHEN _observaciones <> '' THEN ': ' || _observaciones ELSE '' END,
      (_resultado->>'monto')::numeric);
  ELSE
    INSERT INTO public.eventos_contrato
      (contrato_id, liquidacion_id, periodo, fecha, tipo, categoria, descripcion, monto)
    VALUES (_c.contrato_id, _c.liquidacion_id, _liq.periodo, CURRENT_DATE,
      'mora_condonada','financiero',
      'Propietario rechazó la aplicación de punitorios — punitorio condonado' ||
        CASE WHEN _observaciones <> '' THEN ': ' || _observaciones ELSE '' END,
      _c.monto_estimado);
    _resultado := jsonb_build_object('ok', true, 'condonado', true);
  END IF;

  RETURN jsonb_build_object('ok', true, 'aprobada', _aprobada, 'detalle', _resultado);
END;
$$;
