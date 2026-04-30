-- =====================================================================
-- Triggers, funciones y políticas RLS
-- (refleja el estado actual: sin personas_roles, con usuarios/roles/personal)
-- =====================================================================

-- ---------- updated_at automático ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_personas_updated_at ON public.personas;
CREATE TRIGGER trg_personas_updated_at
  BEFORE UPDATE ON public.personas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS personal_set_updated_at ON public.personal;
CREATE TRIGGER personal_set_updated_at
  BEFORE UPDATE ON public.personal
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Recalcular totales de la liquidación cuando cambian pagos ----------
CREATE OR REPLACE FUNCTION public.recalc_liquidacion_totales()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_liq_id uuid := COALESCE(NEW.liquidacion_id, OLD.liquidacion_id);
  v_total_cobrado numeric(14,2);
  v_total_cobrar  numeric(14,2);
  v_pendiente     numeric(14,2);
  v_nuevo_estado  estado_liquidacion;
BEGIN
  SELECT COALESCE(SUM(monto),0) INTO v_total_cobrado
    FROM public.pagos
    WHERE liquidacion_id = v_liq_id AND estado = 'Confirmado';

  SELECT total_cobrar INTO v_total_cobrar
    FROM public.liquidaciones WHERE id = v_liq_id;

  v_pendiente := GREATEST(v_total_cobrar - v_total_cobrado, 0);

  v_nuevo_estado := CASE
    WHEN v_total_cobrado <= 0                   THEN 'Pendiente'::estado_liquidacion
    WHEN v_total_cobrado >= v_total_cobrar      THEN 'Cobrada'::estado_liquidacion
    ELSE                                             'Parcial'::estado_liquidacion
  END;

  UPDATE public.liquidaciones
     SET total_cobrado = v_total_cobrado,
         pendiente     = v_pendiente,
         estado        = CASE WHEN estado IN ('Transferida','Anulada','Borrador')
                              THEN estado ELSE v_nuevo_estado END
   WHERE id = v_liq_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_pagos_recalc ON public.pagos;
CREATE TRIGGER trg_pagos_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.pagos
  FOR EACH ROW EXECUTE FUNCTION public.recalc_liquidacion_totales();

-- ---------- Bitácora automática de pagos en eventos_contrato ----------
CREATE OR REPLACE FUNCTION public.log_pago_evento()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.estado = 'Confirmado' THEN
    INSERT INTO public.eventos_contrato (contrato_id, liquidacion_id, fecha, tipo, categoria, descripcion, monto)
    VALUES (NEW.contrato_id, NEW.liquidacion_id, NEW.fecha,
            'pago_registrado', 'financiero',
            'Pago ' || NEW.medio_pago::text || ' ref=' || COALESCE(NEW.referencia,''),
            NEW.monto);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pagos_log ON public.pagos;
CREATE TRIGGER trg_pagos_log
  AFTER INSERT ON public.pagos
  FOR EACH ROW EXECUTE FUNCTION public.log_pago_evento();

-- ---------- Bitácora automática al emitir liquidación ----------
CREATE OR REPLACE FUNCTION public.log_liquidacion_evento()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.eventos_contrato (contrato_id, liquidacion_id, periodo, fecha, tipo, categoria, descripcion, monto)
    VALUES (NEW.contrato_id, NEW.id, NEW.periodo, NEW.fecha_emision,
            'liquidacion_emitida', 'financiero',
            'Liquidación ' || NEW.periodo_label || ' por $' || NEW.total_cobrar,
            NEW.total_cobrar);
  ELSIF TG_OP = 'UPDATE' AND NEW.estado <> OLD.estado THEN
    INSERT INTO public.eventos_contrato (contrato_id, liquidacion_id, periodo, fecha, tipo, categoria, descripcion)
    VALUES (NEW.contrato_id, NEW.id, NEW.periodo, CURRENT_DATE,
            'liquidacion_estado', 'administrativo',
            'Estado: ' || OLD.estado || ' → ' || NEW.estado);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_liq_log ON public.liquidaciones;
CREATE TRIGGER trg_liq_log
  AFTER INSERT OR UPDATE ON public.liquidaciones
  FOR EACH ROW EXECUTE FUNCTION public.log_liquidacion_evento();

-- ---------- Mantener propiedades.estado y contrato_activo_id ----------
CREATE OR REPLACE FUNCTION public.sync_propiedad_estado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.estado = 'Activo' THEN
    UPDATE public.propiedades
       SET estado='Alquilada', contrato_activo_id = NEW.id
     WHERE id = NEW.propiedad_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.estado <> OLD.estado THEN
    IF NEW.estado IN ('Vencido','Rescindido') THEN
      UPDATE public.propiedades
         SET estado='Vacante', contrato_activo_id = NULL
       WHERE id = NEW.propiedad_id AND contrato_activo_id = NEW.id;
    ELSIF NEW.estado = 'Activo' THEN
      UPDATE public.propiedades
         SET estado='Alquilada', contrato_activo_id = NEW.id
       WHERE id = NEW.propiedad_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contrato_sync_propiedad ON public.contratos;
CREATE TRIGGER trg_contrato_sync_propiedad
  AFTER INSERT OR UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.sync_propiedad_estado();

-- =====================================================================
-- AUTH: trigger sobre auth.users + sync user_roles ↔ roles
-- =====================================================================

-- Crea automáticamente la fila pública en `usuarios` cuando alguien se
-- registra en auth.users. Si vino `persona_id` en raw_user_meta_data y no
-- está tomado por otro usuario, lo vincula.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _persona_id uuid;
BEGIN
  BEGIN
    _persona_id := NULLIF(NEW.raw_user_meta_data->>'persona_id','')::uuid;
  EXCEPTION WHEN OTHERS THEN
    _persona_id := NULL;
  END;

  IF _persona_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.usuarios WHERE persona_id = _persona_id
  ) THEN
    _persona_id := NULL;
  END IF;

  INSERT INTO public.usuarios (id, email, nombre, persona_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.email,''),
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', ''),
    _persona_id
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        persona_id = COALESCE(public.usuarios.persona_id, EXCLUDED.persona_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Sincroniza la columna denormalizada `user_roles.role` con `role_id` (y vv).
-- Permite que `has_role()` siga siendo SQL puro y simple.
CREATE OR REPLACE FUNCTION public.sync_user_roles_enum()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role_id IS NOT NULL AND (NEW.role IS NULL OR TG_OP = 'INSERT' OR NEW.role_id IS DISTINCT FROM OLD.role_id) THEN
    SELECT codigo INTO NEW.role FROM public.roles WHERE id = NEW.role_id;
  ELSIF NEW.role IS NOT NULL AND NEW.role_id IS NULL THEN
    SELECT id INTO NEW.role_id FROM public.roles WHERE codigo = NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_sync ON public.user_roles;
CREATE TRIGGER trg_user_roles_sync
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_roles_enum();

-- Helper SECURITY DEFINER para RLS (no consulta `user_roles` con la sesión
-- actual, evitando recursión).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE public.personas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propietarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquilinos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propiedades           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidaciones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conceptos_liquidacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_contrato      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacion          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria             ENABLE ROW LEVEL SECURITY;

-- Tablas de dominio: lectura/escritura libre para autenticados
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['personas','propietarios','inquilinos','propiedades',
                           'contratos','liquidaciones','conceptos_liquidacion',
                           'pagos','eventos_contrato','sucursales']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS auth_select_%1$s ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY auth_select_%1$s ON public.%1$s FOR SELECT TO authenticated USING (true);', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_ins_%1$s ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY auth_ins_%1$s ON public.%1$s FOR INSERT TO authenticated WITH CHECK (true);', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_upd_%1$s ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY auth_upd_%1$s ON public.%1$s FOR UPDATE TO authenticated USING (true) WITH CHECK (true);', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_del_%1$s ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY auth_del_%1$s ON public.%1$s FOR DELETE TO authenticated USING (true);', t);
  END LOOP;
END $$;

-- organizacion: lectura abierta a auth, mutación solo admin
CREATE POLICY auth_select_organizacion ON public.organizacion FOR SELECT TO authenticated USING (true);
CREATE POLICY admin_upd_organizacion   ON public.organizacion FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY admin_del_organizacion   ON public.organizacion FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- usuarios: cada uno se ve a sí mismo; admin ve todo y muta
CREATE POLICY usuarios_self_or_admin_select ON public.usuarios FOR SELECT TO authenticated
  USING (id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY usuarios_admin_ins ON public.usuarios FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY usuarios_admin_upd ON public.usuarios FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR id = auth.uid())
  WITH CHECK (has_role(auth.uid(),'admin') OR id = auth.uid());
CREATE POLICY usuarios_admin_del ON public.usuarios FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- roles: lectura abierta, mutación solo admin
CREATE POLICY roles_auth_select ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY roles_admin_ins   ON public.roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY roles_admin_upd   ON public.roles FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY roles_admin_del   ON public.roles FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- user_roles: cada uno ve los suyos; admin lee todo y administra
CREATE POLICY user_roles_self_select ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY user_roles_admin_ins ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY user_roles_admin_upd ON public.user_roles FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY user_roles_admin_del ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- personal: lectura abierta a auth; alta/edición/baja solo admin
CREATE POLICY personal_auth_select ON public.personal FOR SELECT TO authenticated USING (true);
CREATE POLICY personal_admin_ins   ON public.personal FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY personal_admin_upd   ON public.personal FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY personal_admin_del   ON public.personal FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- auditoria: solo admin lee; cualquiera autenticado puede insertar; nadie modifica/borra
CREATE POLICY auditoria_admin_select ON public.auditoria FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY auditoria_auth_insert  ON public.auditoria FOR INSERT TO authenticated WITH CHECK (true);
-- (sin policies de UPDATE/DELETE ⇒ bloqueado por RLS)
