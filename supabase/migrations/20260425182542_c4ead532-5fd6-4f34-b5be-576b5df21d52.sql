
-- ─────────────────────────────────────────────────────────
-- 1) ENUMS
-- ─────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','administrativo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- agregar 'personal' al enum existente rol_persona
DO $$ BEGIN
  ALTER TYPE public.rol_persona ADD VALUE IF NOT EXISTS 'personal';
EXCEPTION WHEN others THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────
-- 2) ORGANIZACIÓN + SUCURSALES
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizacion (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  logo_url    text DEFAULT '',
  cuit        text DEFAULT '',
  direccion   text DEFAULT '',
  telefono    text DEFAULT '',
  email       text DEFAULT '',
  fecha_alta  date NOT NULL DEFAULT CURRENT_DATE,
  fecha_baja  date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sucursales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES public.organizacion(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  direccion       text DEFAULT '',
  telefono        text DEFAULT '',
  es_central      boolean NOT NULL DEFAULT false,
  activa          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- 3) USER ROLES (separada de profiles, evita escalación)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         public.app_role NOT NULL,
  sucursal_id  uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Función SECURITY DEFINER para chequear roles sin recursión
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ─────────────────────────────────────────────────────────
-- 4) PERSONAS — link a auth.users y a sucursal
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.personas
  ADD COLUMN IF NOT EXISTS user_id     uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────
-- 5) PROPIEDADES — datos catastrales opcionales
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.propiedades
  ADD COLUMN IF NOT EXISTS latitud              numeric,
  ADD COLUMN IF NOT EXISTS longitud             numeric,
  ADD COLUMN IF NOT EXISTS matricula_catastral  text;

-- ─────────────────────────────────────────────────────────
-- 6) AUDITORÍA
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auditoria (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  user_id       uuid,
  user_email    text DEFAULT '',
  accion        text NOT NULL,           -- crear|editar|eliminar|anular|otro
  entidad       text NOT NULL,           -- contrato|liquidacion|pago|concepto|propiedad|persona|organizacion|sucursal|user_role
  entidad_id    uuid,
  descripcion   text DEFAULT '',
  datos_antes   jsonb,
  datos_despues jsonb,
  monto         numeric
);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad     ON public.auditoria(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at  ON public.auditoria(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- 7) Triggers de updated_at en tablas nuevas
-- ─────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_org_updated     ON public.organizacion;
CREATE TRIGGER trg_org_updated     BEFORE UPDATE ON public.organizacion     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_suc_updated     ON public.sucursales;
CREATE TRIGGER trg_suc_updated     BEFORE UPDATE ON public.sucursales       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────
-- 8) RPC anular_pago — atómico, recalcula liquidación
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.anular_pago(_pago_id uuid, _motivo text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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

  -- Marcar pago anulado
  UPDATE public.pagos
     SET estado = 'Anulado',
         observaciones = COALESCE(observaciones,'') ||
           CASE WHEN _motivo <> '' THEN E'\n[Anulado] ' || _motivo ELSE E'\n[Anulado]' END
   WHERE id = _pago_id;

  -- Recalcular total cobrado a partir de pagos confirmados restantes
  SELECT COALESCE(SUM(monto),0) INTO _nuevo_total
    FROM public.pagos
   WHERE liquidacion_id = _liq.id AND estado = 'Confirmado';

  _nuevo_pend := _liq.total_cobrar - _nuevo_total;

  -- Reglas de estado revertido
  IF _nuevo_total <= 0 THEN
    _nuevo_estado := 'Pendiente';
  ELSIF _nuevo_total < _liq.total_cobrar THEN
    _nuevo_estado := 'Parcial';
  ELSE
    _nuevo_estado := _liq.estado; -- sigue Cobrada/Transferida
  END IF;

  UPDATE public.liquidaciones
     SET total_cobrado = _nuevo_total,
         pendiente     = _nuevo_pend,
         estado        = _nuevo_estado
   WHERE id = _liq.id;

  -- Evento en bitácora del contrato
  INSERT INTO public.eventos_contrato
    (contrato_id, liquidacion_id, periodo, fecha, tipo, categoria, descripcion, monto)
  VALUES (
    _pago.contrato_id, _liq.id, _liq.periodo, CURRENT_DATE,
    'pago_anulado', 'financiero',
    'Pago anulado' || CASE WHEN _motivo <> '' THEN ': ' || _motivo ELSE '' END,
    _pago.monto
  );

  -- Auditoría
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
$$;

-- ─────────────────────────────────────────────────────────
-- 9) Reescribir RLS: quitar "Allow all" y restringir a autenticados
-- ─────────────────────────────────────────────────────────

-- helper macro: drop "Allow all" policies si existen
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname='public'
      AND policyname LIKE 'Allow all%'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Activar RLS en nuevas tablas
ALTER TABLE public.organizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria    ENABLE ROW LEVEL SECURITY;

-- Tablas operativas: acceso libre a autenticados
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'personas','personas_roles','propiedades','contratos',
    'liquidaciones','conceptos_liquidacion','pagos','eventos_contrato',
    'organizacion','sucursales'
  ]
  LOOP
    EXECUTE format($f$
      CREATE POLICY "auth_select_%1$s" ON public.%1$I FOR SELECT TO authenticated USING (true);
      CREATE POLICY "auth_ins_%1$s"    ON public.%1$I FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "auth_upd_%1$s"    ON public.%1$I FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "auth_del_%1$s"    ON public.%1$I FOR DELETE TO authenticated USING (true);
    $f$, t);
  END LOOP;
END $$;

-- Restricción extra: solo admin puede UPDATE/DELETE de organización
DROP POLICY IF EXISTS "auth_upd_organizacion" ON public.organizacion;
DROP POLICY IF EXISTS "auth_del_organizacion" ON public.organizacion;
CREATE POLICY "admin_upd_organizacion" ON public.organizacion
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_del_organizacion" ON public.organizacion
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- user_roles: cada usuario ve los suyos; solo admin escribe
CREATE POLICY "user_roles_self_select" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_admin_ins" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_admin_upd" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_admin_del" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Auditoría: solo admin lee; cualquier autenticado inserta; nadie modifica/borra
CREATE POLICY "auditoria_admin_select" ON public.auditoria
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auditoria_auth_insert" ON public.auditoria
  FOR INSERT TO authenticated WITH CHECK (true);
-- (sin policies de UPDATE/DELETE → bloqueado)

-- ─────────────────────────────────────────────────────────
-- 10) SEED: organización + sucursal central
-- ─────────────────────────────────────────────────────────
INSERT INTO public.organizacion (id, nombre, fecha_alta)
SELECT gen_random_uuid(), 'CyT Propiedades', CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM public.organizacion);

INSERT INTO public.sucursales (organizacion_id, nombre, es_central, activa)
SELECT o.id, 'Central', true, true
FROM public.organizacion o
WHERE NOT EXISTS (SELECT 1 FROM public.sucursales WHERE es_central = true);
