-- Tabla personal: vincula persona ↔ sucursal con alta/baja
CREATE TABLE public.personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  fecha_alta date NOT NULL DEFAULT CURRENT_DATE,
  causa_alta text NOT NULL DEFAULT 'Alta Personal',
  fecha_baja date,
  causa_baja text,
  activo boolean NOT NULL GENERATED ALWAYS AS (fecha_baja IS NULL) STORED,
  observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Solo un legajo activo por persona
CREATE UNIQUE INDEX personal_persona_activo_uidx
  ON public.personal (persona_id) WHERE fecha_baja IS NULL;

CREATE INDEX personal_sucursal_idx ON public.personal (sucursal_id);

ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;

CREATE POLICY personal_auth_select ON public.personal FOR SELECT TO authenticated USING (true);
CREATE POLICY personal_admin_ins ON public.personal FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY personal_admin_upd ON public.personal FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY personal_admin_del ON public.personal FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER personal_set_updated_at
  BEFORE UPDATE ON public.personal
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill: para cada usuario con persona_id, crear legajo activo en su sucursal del rol
INSERT INTO public.personal (persona_id, sucursal_id, fecha_alta, causa_alta)
SELECT DISTINCT u.persona_id,
       (SELECT ur.sucursal_id FROM public.user_roles ur WHERE ur.user_id = u.id LIMIT 1),
       COALESCE(u.created_at::date, CURRENT_DATE),
       'Alta Personal'
FROM public.usuarios u
WHERE u.persona_id IS NOT NULL
ON CONFLICT DO NOTHING;