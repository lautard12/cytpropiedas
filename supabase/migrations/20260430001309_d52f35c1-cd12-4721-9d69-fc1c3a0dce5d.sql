-- ============================================================
-- Refactor estructural: usuarios.persona_id (1:1) y eliminación
-- de personas_roles + trigger + enum rol_persona.
-- Roles de aplicación quedan SOLO en user_roles (usuarios↔roles).
-- ============================================================

-- 1) usuarios: nueva columna persona_id
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS persona_id uuid;

-- 2) Backfill: copiar el vínculo actual personas.user_id → usuarios.persona_id
UPDATE public.usuarios u
   SET persona_id = p.id
  FROM public.personas p
 WHERE p.user_id = u.id
   AND u.persona_id IS NULL;

-- 3) FK + UNIQUE en usuarios.persona_id
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_persona_id_fkey
  FOREIGN KEY (persona_id) REFERENCES public.personas(id) ON DELETE SET NULL;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_persona_id_key UNIQUE (persona_id);

-- 4) Quitar la relación inversa: personas.user_id
ALTER TABLE public.personas
  DROP CONSTRAINT IF EXISTS personas_user_id_fkey;
ALTER TABLE public.personas
  DROP CONSTRAINT IF EXISTS personas_user_id_key;
ALTER TABLE public.personas
  DROP COLUMN IF EXISTS user_id;

-- 5) Eliminar triggers de sincronización personas_roles
DROP TRIGGER IF EXISTS trg_sync_personas_roles_propietarios ON public.propietarios;
DROP TRIGGER IF EXISTS trg_sync_personas_roles_inquilinos  ON public.inquilinos;
DROP TRIGGER IF EXISTS sync_personas_roles_propietarios    ON public.propietarios;
DROP TRIGGER IF EXISTS sync_personas_roles_inquilinos      ON public.inquilinos;

DROP FUNCTION IF EXISTS public.sync_personas_roles() CASCADE;

-- 6) Eliminar tabla personas_roles
DROP TABLE IF EXISTS public.personas_roles CASCADE;

-- 7) Eliminar enum rol_persona (ya no se usa)
DROP TYPE IF EXISTS public.rol_persona;

-- 8) Actualizar trigger handle_new_auth_user para vincular persona_id si viene en metadata
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _persona_id uuid;
BEGIN
  -- Si vino persona_id en raw_user_meta_data, intentamos vincular (si está libre)
  BEGIN
    _persona_id := NULLIF(NEW.raw_user_meta_data->>'persona_id','')::uuid;
  EXCEPTION WHEN OTHERS THEN
    _persona_id := NULL;
  END;

  IF _persona_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.usuarios WHERE persona_id = _persona_id
  ) THEN
    _persona_id := NULL; -- ya está tomado
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
$function$;
