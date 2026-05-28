
-- sucursales: writes admin only
DROP POLICY IF EXISTS auth_ins_sucursales ON public.sucursales;
DROP POLICY IF EXISTS auth_upd_sucursales ON public.sucursales;
DROP POLICY IF EXISTS auth_del_sucursales ON public.sucursales;
CREATE POLICY admin_ins_sucursales ON public.sucursales FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_upd_sucursales ON public.sucursales FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_del_sucursales ON public.sucursales FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- organizacion: insert admin only
DROP POLICY IF EXISTS auth_ins_organizacion ON public.organizacion;
CREATE POLICY admin_ins_organizacion ON public.organizacion FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- rendiciones_propietario: SELECT admin only
DROP POLICY IF EXISTS rend_auth_select ON public.rendiciones_propietario;
CREATE POLICY rend_admin_select ON public.rendiciones_propietario FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- auditoria: insert must match logged in user
DROP POLICY IF EXISTS auditoria_auth_insert ON public.auditoria;
CREATE POLICY auditoria_self_insert ON public.auditoria FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- rescindir_contrato: admin only
CREATE OR REPLACE FUNCTION public.rescindir_contrato(_contrato_id uuid, _fecha_efectiva date, _motivo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrato record;
  v_meses_rest integer;
  v_valor_rest numeric;
  v_multa numeric;
  v_liq_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo administradores pueden rescindir contratos';
  END IF;

  SELECT * INTO v_contrato FROM public.contratos WHERE id = _contrato_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato no encontrado'; END IF;

  v_meses_rest := GREATEST(0, (date_part('year', age(v_contrato.fecha_fin, _fecha_efectiva))*12 + date_part('month', age(v_contrato.fecha_fin, _fecha_efectiva)))::int);
  v_valor_rest := v_meses_rest * v_contrato.alquiler_base;
  v_multa := ROUND(v_valor_rest * COALESCE(v_contrato.multa_rescision_porcentaje, 0) / 100);

  UPDATE public.contratos SET estado = 'Rescindido' WHERE id = _contrato_id;

  IF v_contrato.propiedad_id IS NOT NULL THEN
    UPDATE public.propiedades SET estado = 'Vacante' WHERE id = v_contrato.propiedad_id;
  END IF;

  IF v_multa > 0 THEN
    INSERT INTO public.liquidaciones (contrato_id, periodo, fecha_vencimiento, monto_total, estado, observaciones)
    VALUES (_contrato_id, to_char(_fecha_efectiva, 'YYYY-MM'), _fecha_efectiva + INTERVAL '10 days', v_multa, 'Pendiente', 'Multa por rescisión anticipada')
    RETURNING id INTO v_liq_id;

    INSERT INTO public.conceptos_liquidacion (liquidacion_id, concepto, monto, responsable, aplica_al_inquilino)
    VALUES (v_liq_id, 'Multa rescisión anticipada', v_multa, 'Inquilino', true);
  END IF;

  INSERT INTO public.eventos_contrato (contrato_id, tipo, descripcion, monto, fecha)
  VALUES (_contrato_id, 'rescision', COALESCE(_motivo, 'Rescisión anticipada'), v_multa, _fecha_efectiva);

  RETURN jsonb_build_object('ok', true, 'multa_monto', v_multa, 'liquidacion_id', v_liq_id);
END;
$$;

-- resolver_consulta_mora: admin only
CREATE OR REPLACE FUNCTION public.resolver_consulta_mora(_consulta_id uuid, _decision text, _observaciones text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consulta record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo administradores pueden resolver consultas de mora';
  END IF;

  SELECT * INTO v_consulta FROM public.consultas_mora WHERE id = _consulta_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulta no encontrada'; END IF;

  UPDATE public.consultas_mora
  SET estado = CASE WHEN _decision = 'aprobar' THEN 'Aprobada' ELSE 'Rechazada' END,
      observaciones = COALESCE(_observaciones, observaciones),
      decidido_por = auth.uid(),
      fecha_respuesta = CURRENT_DATE,
      updated_at = now()
  WHERE id = _consulta_id;

  IF _decision = 'aprobar' THEN
    PERFORM public.aplicar_punitorios(v_consulta.liquidacion_id);
    INSERT INTO public.eventos_contrato (contrato_id, tipo, descripcion, fecha)
    VALUES (v_consulta.contrato_id, 'mora_aprobada', 'Punitorios aplicados tras autorización', CURRENT_DATE);
  ELSE
    INSERT INTO public.eventos_contrato (contrato_id, tipo, descripcion, fecha)
    VALUES (v_consulta.contrato_id, 'mora_rechazada', COALESCE(_observaciones, 'Consulta rechazada'), CURRENT_DATE);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;
