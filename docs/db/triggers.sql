-- =====================================================================
-- Triggers, funciones y políticas RLS
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

-- ---------- Sincronización propietarios/inquilinos ↔ personas_roles ----------
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

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
-- En el MVP actual está abierto a `public` (true/true). Cuando se sume
-- autenticación, reemplazar por políticas basadas en `auth.uid()` y un
-- modelo de roles (ver docs/02-arquitectura.md).
-- =====================================================================

ALTER TABLE public.personas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propiedades           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidaciones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conceptos_liquidacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_contrato      ENABLE ROW LEVEL SECURITY;

-- Política MVP demo: acceso total
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['personas','personas_roles','propiedades','contratos',
                           'liquidaciones','conceptos_liquidacion','pagos','eventos_contrato']
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "Allow all access to %1$s" ON public.%1$s;', t);
    EXECUTE format(
      'CREATE POLICY "Allow all access to %1$s" ON public.%1$s FOR ALL USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;

-- =====================================================================
-- POLÍTICAS RLS RECOMENDADAS PARA PRODUCCIÓN (referencia)
-- =====================================================================
-- Requisitos previos:
--   1. Tabla public.user_roles (id, user_id, rol app_role) — ver docs.
--   2. Función public.has_role(_user_id uuid, _role app_role) SECURITY DEFINER.
--
-- Ejemplo (NO ejecutar todavía):
--   CREATE POLICY "Operadores leen personas"
--     ON public.personas FOR SELECT TO authenticated
--     USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operador'));
--
--   CREATE POLICY "Solo admin elimina personas"
--     ON public.personas FOR DELETE TO authenticated
--     USING (public.has_role(auth.uid(),'admin'));
-- =====================================================================
