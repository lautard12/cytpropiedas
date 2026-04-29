
-- ============================================================
-- 1) Tabla usuarios (espejo público de auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  nombre text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  ultimo_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_uidx ON public.usuarios (lower(email));

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuarios_self_or_admin_select ON public.usuarios
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY usuarios_admin_ins ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY usuarios_admin_upd ON public.usuarios
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR id = auth.uid());

CREATE POLICY usuarios_admin_del ON public.usuarios
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_usuarios_set_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill desde auth.users
INSERT INTO public.usuarios (id, email, nombre, created_at)
SELECT u.id, COALESCE(u.email,''),
       COALESCE(u.raw_user_meta_data->>'nombre', u.raw_user_meta_data->>'full_name', ''),
       u.created_at
  FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- Trigger on signup: crear fila en usuarios automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre)
  VALUES (
    NEW.id,
    COALESCE(NEW.email,''),
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- 2) Tabla roles (catálogo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo app_role NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_auth_select ON public.roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY roles_admin_ins ON public.roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY roles_admin_upd ON public.roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY roles_admin_del ON public.roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.roles (codigo, nombre, descripcion) VALUES
  ('admin','Administrador','Acceso total: usuarios, organización, auditoría, todas las operaciones'),
  ('administrativo','Administrativo','Operaciones diarias: contratos, liquidaciones, pagos, personas')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- 3) user_roles ahora N:M real (FKs y role_id)
-- ============================================================
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS role_id uuid;

UPDATE public.user_roles ur
   SET role_id = r.id
  FROM public.roles r
 WHERE ur.role_id IS NULL AND ur.role = r.codigo;

ALTER TABLE public.user_roles
  ALTER COLUMN role_id SET NOT NULL;

-- FKs explícitas
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
  DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey,
  DROP CONSTRAINT IF EXISTS user_roles_sucursal_id_fkey,
  ADD CONSTRAINT user_roles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.usuarios(id) ON DELETE CASCADE,
  ADD CONSTRAINT user_roles_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT user_roles_sucursal_id_fkey
    FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE SET NULL;

-- Unicidad N:M (un usuario no repite el mismo rol)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_role_uniq'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_role_uniq UNIQUE (user_id, role_id);
  END IF;
END $$;

-- Mantener columna `role` (enum) sincronizada para compat con has_role()
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

-- ============================================================
-- 4) personas: vincular a usuarios (no a auth.users)
-- ============================================================
-- Backfill: garantizar que cualquier user_id presente en personas exista en usuarios
INSERT INTO public.usuarios (id, email, nombre)
SELECT DISTINCT p.user_id, COALESCE(u.email,''), COALESCE(p.nombre,'')
  FROM public.personas p
  JOIN auth.users u ON u.id = p.user_id
 WHERE p.user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.personas
  DROP CONSTRAINT IF EXISTS personas_user_id_fkey,
  DROP CONSTRAINT IF EXISTS personas_sucursal_id_fkey,
  ADD CONSTRAINT personas_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD CONSTRAINT personas_sucursal_id_fkey
    FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE SET NULL;

-- Una persona vinculada a UN usuario (1-1)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname='public' AND indexname='personas_user_id_uniq'
  ) THEN
    CREATE UNIQUE INDEX personas_user_id_uniq
      ON public.personas(user_id) WHERE user_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================
-- 5) auditoría: FK a usuarios
-- ============================================================
-- Asegurar usuarios para los user_id históricos
INSERT INTO public.usuarios (id, email)
SELECT DISTINCT a.user_id, COALESCE(a.user_email,'')
  FROM public.auditoria a
  JOIN auth.users u ON u.id = a.user_id
 WHERE a.user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.auditoria
  DROP CONSTRAINT IF EXISTS auditoria_user_id_fkey,
  ADD CONSTRAINT auditoria_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- ============================================================
-- 6) sucursales: FK a organizacion
-- ============================================================
ALTER TABLE public.sucursales
  DROP CONSTRAINT IF EXISTS sucursales_organizacion_id_fkey,
  ADD CONSTRAINT sucursales_organizacion_id_fkey
    FOREIGN KEY (organizacion_id) REFERENCES public.organizacion(id) ON DELETE CASCADE;
