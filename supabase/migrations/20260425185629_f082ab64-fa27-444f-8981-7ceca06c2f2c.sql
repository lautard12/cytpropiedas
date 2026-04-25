-- ============================================================
-- 1) Crear tablas propietarios e inquilinos (1-a-1 con personas)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.propietarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id uuid NOT NULL UNIQUE REFERENCES public.personas(id) ON DELETE CASCADE,
  banco text NOT NULL DEFAULT '',
  cbu text NOT NULL DEFAULT '',
  alias_cbu text NOT NULL DEFAULT '',
  condicion_iva text NOT NULL DEFAULT 'Consumidor Final',
  observaciones_fiscales text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inquilinos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id uuid NOT NULL UNIQUE REFERENCES public.personas(id) ON DELETE CASCADE,
  garante_nombre text NOT NULL DEFAULT '',
  garante_telefono text NOT NULL DEFAULT '',
  garante_dni text NOT NULL DEFAULT '',
  ocupacion text NOT NULL DEFAULT '',
  ingresos_declarados numeric NOT NULL DEFAULT 0,
  observaciones_inquilino text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_propietarios_persona ON public.propietarios(persona_id);
CREATE INDEX IF NOT EXISTS idx_inquilinos_persona ON public.inquilinos(persona_id);

DROP TRIGGER IF EXISTS trg_propietarios_updated ON public.propietarios;
CREATE TRIGGER trg_propietarios_updated
  BEFORE UPDATE ON public.propietarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_inquilinos_updated ON public.inquilinos;
CREATE TRIGGER trg_inquilinos_updated
  BEFORE UPDATE ON public.inquilinos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2) Backfill propietarios e inquilinos desde personas con rol
-- ============================================================

INSERT INTO public.propietarios (persona_id, banco, cbu)
SELECT p.id, COALESCE(p.banco,''), COALESCE(p.cbu,'')
  FROM public.personas p
  JOIN public.personas_roles pr ON pr.persona_id = p.id AND pr.rol = 'propietario'
 WHERE NOT EXISTS (SELECT 1 FROM public.propietarios x WHERE x.persona_id = p.id);

-- También crear propietarios para personas referenciadas en propiedades/contratos
-- aunque no tengan el rol cargado en personas_roles (consistencia)
INSERT INTO public.propietarios (persona_id, banco, cbu)
SELECT DISTINCT p.id, COALESCE(p.banco,''), COALESCE(p.cbu,'')
  FROM public.personas p
 WHERE (p.id IN (SELECT propietario_id FROM public.propiedades WHERE propietario_id IS NOT NULL)
     OR p.id IN (SELECT propietario_id FROM public.contratos WHERE propietario_id IS NOT NULL))
   AND NOT EXISTS (SELECT 1 FROM public.propietarios x WHERE x.persona_id = p.id);

INSERT INTO public.inquilinos (persona_id, garante_nombre, garante_telefono)
SELECT p.id, COALESCE(p.garante,''), COALESCE(p.garante_telefono,'')
  FROM public.personas p
  JOIN public.personas_roles pr ON pr.persona_id = p.id AND pr.rol = 'inquilino'
 WHERE NOT EXISTS (SELECT 1 FROM public.inquilinos x WHERE x.persona_id = p.id);

INSERT INTO public.inquilinos (persona_id, garante_nombre, garante_telefono)
SELECT DISTINCT p.id, COALESCE(p.garante,''), COALESCE(p.garante_telefono,'')
  FROM public.personas p
 WHERE p.id IN (SELECT inquilino_id FROM public.contratos WHERE inquilino_id IS NOT NULL)
   AND NOT EXISTS (SELECT 1 FROM public.inquilinos x WHERE x.persona_id = p.id);

-- ============================================================
-- 3) Drop FKs viejas hacia personas
-- ============================================================

ALTER TABLE public.propiedades DROP CONSTRAINT IF EXISTS propiedades_propietario_id_fkey;
ALTER TABLE public.contratos   DROP CONSTRAINT IF EXISTS contratos_propietario_id_fkey;
ALTER TABLE public.contratos   DROP CONSTRAINT IF EXISTS contratos_inquilino_id_fkey;

-- ============================================================
-- 4) Repuntar valores: persona_id -> propietarios.id / inquilinos.id
-- ============================================================

UPDATE public.propiedades pr
   SET propietario_id = pp.id
  FROM public.propietarios pp
 WHERE pp.persona_id = pr.propietario_id;

UPDATE public.contratos c
   SET propietario_id = pp.id
  FROM public.propietarios pp
 WHERE pp.persona_id = c.propietario_id;

UPDATE public.contratos c
   SET inquilino_id = ii.id
  FROM public.inquilinos ii
 WHERE ii.persona_id = c.inquilino_id;

-- ============================================================
-- 5) Recrear FKs apuntando a las nuevas tablas
-- ============================================================

ALTER TABLE public.propiedades
  ADD CONSTRAINT propiedades_propietario_id_fkey
  FOREIGN KEY (propietario_id) REFERENCES public.propietarios(id) ON DELETE SET NULL;

ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_propietario_id_fkey
  FOREIGN KEY (propietario_id) REFERENCES public.propietarios(id) ON DELETE SET NULL;

ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_inquilino_id_fkey
  FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE SET NULL;

-- ============================================================
-- 6) Quitar columnas específicas de rol de personas
-- ============================================================

ALTER TABLE public.personas
  DROP COLUMN IF EXISTS banco,
  DROP COLUMN IF EXISTS cbu,
  DROP COLUMN IF EXISTS garante,
  DROP COLUMN IF EXISTS garante_telefono;

-- ============================================================
-- 7) Triggers de sincronización con personas_roles
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_personas_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rol rol_persona;
BEGIN
  IF TG_TABLE_NAME = 'propietarios' THEN _rol := 'propietario';
  ELSIF TG_TABLE_NAME = 'inquilinos' THEN _rol := 'inquilino';
  ELSE RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.personas_roles (persona_id, rol)
    VALUES (NEW.persona_id, _rol)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.personas_roles
     WHERE persona_id = OLD.persona_id AND rol = _rol;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_propietarios_roles ON public.propietarios;
CREATE TRIGGER trg_sync_propietarios_roles
  AFTER INSERT OR DELETE ON public.propietarios
  FOR EACH ROW EXECUTE FUNCTION public.sync_personas_roles();

DROP TRIGGER IF EXISTS trg_sync_inquilinos_roles ON public.inquilinos;
CREATE TRIGGER trg_sync_inquilinos_roles
  AFTER INSERT OR DELETE ON public.inquilinos
  FOR EACH ROW EXECUTE FUNCTION public.sync_personas_roles();

-- ============================================================
-- 8) RPC upsert atómicos
-- ============================================================

CREATE OR REPLACE FUNCTION public.upsert_propietario(
  _persona_id uuid,
  _nombre text,
  _dni text,
  _cuit text,
  _email text,
  _telefono text,
  _direccion text,
  _observaciones text,
  _banco text,
  _cbu text,
  _alias_cbu text,
  _condicion_iva text,
  _observaciones_fiscales text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pid uuid;
  _propid uuid;
BEGIN
  IF _persona_id IS NULL THEN
    INSERT INTO public.personas (nombre, dni, cuit, email, telefono, direccion, observaciones)
    VALUES (_nombre, _dni, _cuit, _email, _telefono, _direccion, _observaciones)
    RETURNING id INTO _pid;
  ELSE
    UPDATE public.personas
       SET nombre=_nombre, dni=_dni, cuit=_cuit, email=_email,
           telefono=_telefono, direccion=_direccion, observaciones=_observaciones
     WHERE id=_persona_id;
    _pid := _persona_id;
  END IF;

  INSERT INTO public.propietarios
    (persona_id, banco, cbu, alias_cbu, condicion_iva, observaciones_fiscales)
  VALUES
    (_pid, _banco, _cbu, _alias_cbu, _condicion_iva, _observaciones_fiscales)
  ON CONFLICT (persona_id) DO UPDATE SET
    banco=EXCLUDED.banco,
    cbu=EXCLUDED.cbu,
    alias_cbu=EXCLUDED.alias_cbu,
    condicion_iva=EXCLUDED.condicion_iva,
    observaciones_fiscales=EXCLUDED.observaciones_fiscales
  RETURNING id INTO _propid;

  RETURN _propid;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_inquilino(
  _persona_id uuid,
  _nombre text,
  _dni text,
  _cuit text,
  _email text,
  _telefono text,
  _direccion text,
  _observaciones text,
  _garante_nombre text,
  _garante_telefono text,
  _garante_dni text,
  _ocupacion text,
  _ingresos_declarados numeric,
  _observaciones_inquilino text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pid uuid;
  _inqid uuid;
BEGIN
  IF _persona_id IS NULL THEN
    INSERT INTO public.personas (nombre, dni, cuit, email, telefono, direccion, observaciones)
    VALUES (_nombre, _dni, _cuit, _email, _telefono, _direccion, _observaciones)
    RETURNING id INTO _pid;
  ELSE
    UPDATE public.personas
       SET nombre=_nombre, dni=_dni, cuit=_cuit, email=_email,
           telefono=_telefono, direccion=_direccion, observaciones=_observaciones
     WHERE id=_persona_id;
    _pid := _persona_id;
  END IF;

  INSERT INTO public.inquilinos
    (persona_id, garante_nombre, garante_telefono, garante_dni,
     ocupacion, ingresos_declarados, observaciones_inquilino)
  VALUES
    (_pid, _garante_nombre, _garante_telefono, _garante_dni,
     _ocupacion, _ingresos_declarados, _observaciones_inquilino)
  ON CONFLICT (persona_id) DO UPDATE SET
    garante_nombre=EXCLUDED.garante_nombre,
    garante_telefono=EXCLUDED.garante_telefono,
    garante_dni=EXCLUDED.garante_dni,
    ocupacion=EXCLUDED.ocupacion,
    ingresos_declarados=EXCLUDED.ingresos_declarados,
    observaciones_inquilino=EXCLUDED.observaciones_inquilino
  RETURNING id INTO _inqid;

  RETURN _inqid;
END;
$$;

-- ============================================================
-- 9) RLS
-- ============================================================

ALTER TABLE public.propietarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquilinos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_select_propietarios ON public.propietarios;
DROP POLICY IF EXISTS auth_ins_propietarios    ON public.propietarios;
DROP POLICY IF EXISTS auth_upd_propietarios    ON public.propietarios;
DROP POLICY IF EXISTS auth_del_propietarios    ON public.propietarios;

CREATE POLICY auth_select_propietarios ON public.propietarios FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_ins_propietarios    ON public.propietarios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_upd_propietarios    ON public.propietarios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_del_propietarios    ON public.propietarios FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS auth_select_inquilinos ON public.inquilinos;
DROP POLICY IF EXISTS auth_ins_inquilinos    ON public.inquilinos;
DROP POLICY IF EXISTS auth_upd_inquilinos    ON public.inquilinos;
DROP POLICY IF EXISTS auth_del_inquilinos    ON public.inquilinos;

CREATE POLICY auth_select_inquilinos ON public.inquilinos FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_ins_inquilinos    ON public.inquilinos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_upd_inquilinos    ON public.inquilinos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY auth_del_inquilinos    ON public.inquilinos FOR DELETE TO authenticated USING (true);
