-- 1. Crear enum de roles
CREATE TYPE public.rol_persona AS ENUM ('propietario', 'inquilino', 'garante');

-- 2. Crear tabla personas
CREATE TABLE public.personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  dni text NOT NULL DEFAULT '',
  cuit text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  direccion text NOT NULL DEFAULT '',
  banco text NOT NULL DEFAULT '',
  cbu text NOT NULL DEFAULT '',
  garante text NOT NULL DEFAULT '',
  garante_telefono text NOT NULL DEFAULT '',
  observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Crear tabla personas_roles
CREATE TABLE public.personas_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  rol public.rol_persona NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (persona_id, rol)
);

CREATE INDEX idx_personas_roles_persona ON public.personas_roles(persona_id);
CREATE INDEX idx_personas_roles_rol ON public.personas_roles(rol);

-- 4. RLS abierta (mismo patrón que el resto del sistema)
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to personas" ON public.personas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to personas_roles" ON public.personas_roles FOR ALL USING (true) WITH CHECK (true);

-- 5. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_personas_updated_at
BEFORE UPDATE ON public.personas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Migrar propietarios → personas (conservando IDs)
INSERT INTO public.personas (id, nombre, cuit, email, telefono, direccion, banco, cbu)
SELECT id, nombre, cuit, email, telefono, direccion, banco, cbu FROM public.propietarios;

INSERT INTO public.personas_roles (persona_id, rol)
SELECT id, 'propietario'::rol_persona FROM public.propietarios;

-- 7. Migrar inquilinos → personas (conservando IDs)
INSERT INTO public.personas (id, nombre, dni, email, telefono, garante, garante_telefono)
SELECT id, nombre, dni, email, telefono, garante, garante_telefono FROM public.inquilinos;

INSERT INTO public.personas_roles (persona_id, rol)
SELECT id, 'inquilino'::rol_persona FROM public.inquilinos;

-- 8. Eliminar FKs viejas de contratos hacia propietarios/inquilinos
ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS contratos_propietario_id_fkey;
ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS contratos_inquilino_id_fkey;

-- 9. Recrear FKs apuntando a personas
ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_propietario_id_fkey
  FOREIGN KEY (propietario_id) REFERENCES public.personas(id) ON DELETE SET NULL;

ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_inquilino_id_fkey
  FOREIGN KEY (inquilino_id) REFERENCES public.personas(id) ON DELETE SET NULL;

-- 10. Eliminar FK propiedades → propietarios y recrear hacia personas
ALTER TABLE public.propiedades DROP CONSTRAINT IF EXISTS propiedades_propietario_id_fkey;
ALTER TABLE public.propiedades
  ADD CONSTRAINT propiedades_propietario_id_fkey
  FOREIGN KEY (propietario_id) REFERENCES public.personas(id) ON DELETE SET NULL;

-- 11. Eliminar tablas viejas
DROP TABLE public.propietarios;
DROP TABLE public.inquilinos;