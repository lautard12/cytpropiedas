-- =====================================================================
-- CyT Propiedades — Schema completo (DDL)
-- PostgreSQL 15+ (compatible con Supabase / Lovable Cloud)
-- =====================================================================

-- ---------- EXTENSIONES ----------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE rol_persona       AS ENUM ('propietario','inquilino','garante');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_propiedad    AS ENUM ('Departamento','Casa','Local','Oficina','Cochera','Galpon','Terreno','Otro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_propiedad  AS ENUM ('Vacante','Alquilada','Reservada','En refacción','Inactiva');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_contrato   AS ENUM ('Borrador','Activo','Vencido','Rescindido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_liquidacion AS ENUM ('Borrador','Pendiente','Parcial','Cobrada','Transferida','Anulada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_pago       AS ENUM ('Pendiente','Confirmado','Anulado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE medio_pago        AS ENUM ('Transferencia','Efectivo','Cheque','Mercado Pago','Débito automático');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- TABLAS ----------

-- PERSONAS (maestro único)
CREATE TABLE IF NOT EXISTS public.personas (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            text        NOT NULL,
  dni               text        NOT NULL DEFAULT '',
  cuit              text        NOT NULL DEFAULT '',
  email             text        NOT NULL DEFAULT '',
  telefono          text        NOT NULL DEFAULT '',
  direccion         text        NOT NULL DEFAULT '',
  banco             text        NOT NULL DEFAULT '',
  cbu               text        NOT NULL DEFAULT '',
  garante           text        NOT NULL DEFAULT '',
  garante_telefono  text        NOT NULL DEFAULT '',
  observaciones     text        NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_personas_nombre ON public.personas (nombre);
CREATE INDEX IF NOT EXISTS idx_personas_dni    ON public.personas (dni)   WHERE dni  <> '';
CREATE INDEX IF NOT EXISTS idx_personas_cuit   ON public.personas (cuit)  WHERE cuit <> '';
CREATE INDEX IF NOT EXISTS idx_personas_email  ON public.personas (email) WHERE email<> '';

-- ROLES DE LA PERSONA
CREATE TABLE IF NOT EXISTS public.personas_roles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id  uuid        NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  rol         rol_persona NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (persona_id, rol)
);
CREATE INDEX IF NOT EXISTS idx_personas_roles_persona ON public.personas_roles (persona_id);

-- PROPIEDADES
CREATE TABLE IF NOT EXISTS public.propiedades (
  id                  uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  direccion           text             NOT NULL,
  unidad              text             NOT NULL DEFAULT '',
  tipo                tipo_propiedad   NOT NULL DEFAULT 'Departamento',
  propietario_id      uuid             REFERENCES public.personas(id) ON DELETE SET NULL,
  estado              estado_propiedad NOT NULL DEFAULT 'Vacante',
  contrato_activo_id  uuid,            -- FK añadida al final por dependencia circular
  metros              numeric(10,2)    NOT NULL DEFAULT 0,
  ambientes           int              NOT NULL DEFAULT 1,
  observaciones       text             NOT NULL DEFAULT '',
  created_at          timestamptz      NOT NULL DEFAULT now()
);

-- CONTRATOS
CREATE TABLE IF NOT EXISTS public.contratos (
  id                       uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                   text             NOT NULL UNIQUE,
  propiedad_id             uuid             REFERENCES public.propiedades(id) ON DELETE SET NULL,
  propietario_id           uuid             REFERENCES public.personas(id)    ON DELETE SET NULL,
  inquilino_id             uuid             REFERENCES public.personas(id)    ON DELETE SET NULL,
  fecha_inicio             date             NOT NULL,
  fecha_fin                date             NOT NULL,
  estado                   estado_contrato  NOT NULL DEFAULT 'Activo',
  alquiler_base            numeric(14,2)    NOT NULL DEFAULT 0,
  tipo_ajuste              text             NOT NULL DEFAULT '',
  frecuencia_ajuste        text             NOT NULL DEFAULT '',
  dia_vencimiento          int              NOT NULL DEFAULT 10,
  comision_porcentaje      numeric(5,2)     NOT NULL DEFAULT 10,
  iva                      boolean          NOT NULL DEFAULT false,
  tgi                      text             NOT NULL DEFAULT 'Inquilino',
  api                      text             NOT NULL DEFAULT 'Inquilino',
  expensas_ordinarias      text             NOT NULL DEFAULT 'Inquilino',
  expensas_extraordinarias text             NOT NULL DEFAULT 'Propietario',
  seguro                   text             NOT NULL DEFAULT 'No aplica',
  servicios                text             NOT NULL DEFAULT 'Inquilino',
  reglas_observaciones     text             NOT NULL DEFAULT '',
  created_at               timestamptz      NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contratos_propiedad   ON public.contratos (propiedad_id);
CREATE INDEX IF NOT EXISTS idx_contratos_propietario ON public.contratos (propietario_id);
CREATE INDEX IF NOT EXISTS idx_contratos_inquilino   ON public.contratos (inquilino_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estado      ON public.contratos (estado);

-- FK circular propiedades.contrato_activo_id → contratos.id
ALTER TABLE public.propiedades
  DROP CONSTRAINT IF EXISTS propiedades_contrato_activo_id_fkey;
ALTER TABLE public.propiedades
  ADD  CONSTRAINT propiedades_contrato_activo_id_fkey
  FOREIGN KEY (contrato_activo_id) REFERENCES public.contratos(id) ON DELETE SET NULL;

-- LIQUIDACIONES
CREATE TABLE IF NOT EXISTS public.liquidaciones (
  id                    uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id           uuid               NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  periodo               text               NOT NULL,           -- 'YYYY-MM'
  periodo_label         text               NOT NULL,           -- 'Marzo 2025'
  fecha_emision         date               NOT NULL DEFAULT CURRENT_DATE,
  estado                estado_liquidacion NOT NULL DEFAULT 'Borrador',
  subtotal              numeric(14,2)      NOT NULL DEFAULT 0,
  total_cobrar          numeric(14,2)      NOT NULL DEFAULT 0,
  total_cobrado         numeric(14,2)      NOT NULL DEFAULT 0,
  pendiente             numeric(14,2)      NOT NULL DEFAULT 0,
  comision_inmobiliaria numeric(14,2)      NOT NULL DEFAULT 0,
  neto_propietario      numeric(14,2)      NOT NULL DEFAULT 0,
  saldo_anterior        numeric(14,2)      NOT NULL DEFAULT 0,
  observaciones         text               NOT NULL DEFAULT '',
  created_at            timestamptz        NOT NULL DEFAULT now(),
  UNIQUE (contrato_id, periodo)
);
CREATE INDEX IF NOT EXISTS idx_liq_contrato ON public.liquidaciones (contrato_id);
CREATE INDEX IF NOT EXISTS idx_liq_periodo  ON public.liquidaciones (periodo);
CREATE INDEX IF NOT EXISTS idx_liq_estado   ON public.liquidaciones (estado);

-- CONCEPTOS DE LA LIQUIDACIÓN
CREATE TABLE IF NOT EXISTS public.conceptos_liquidacion (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id      uuid          NOT NULL REFERENCES public.liquidaciones(id) ON DELETE CASCADE,
  concepto            text          NOT NULL,
  monto               numeric(14,2) NOT NULL DEFAULT 0,
  responsable         text          NOT NULL DEFAULT 'Inquilino',
  aplica_al_inquilino boolean       NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_conceptos_liq ON public.conceptos_liquidacion (liquidacion_id);

-- PAGOS
CREATE TABLE IF NOT EXISTS public.pagos (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id  uuid          NOT NULL REFERENCES public.liquidaciones(id) ON DELETE CASCADE,
  contrato_id     uuid          NOT NULL REFERENCES public.contratos(id),
  fecha           date          NOT NULL DEFAULT CURRENT_DATE,
  monto           numeric(14,2) NOT NULL DEFAULT 0,
  medio_pago      medio_pago    NOT NULL DEFAULT 'Transferencia',
  referencia      text          NOT NULL DEFAULT '',
  estado          estado_pago   NOT NULL DEFAULT 'Confirmado',
  observaciones   text          NOT NULL DEFAULT '',
  created_at      timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pagos_liq      ON public.pagos (liquidacion_id);
CREATE INDEX IF NOT EXISTS idx_pagos_contrato ON public.pagos (contrato_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha    ON public.pagos (fecha);

-- EVENTOS DEL CONTRATO (timeline)
CREATE TABLE IF NOT EXISTS public.eventos_contrato (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id     uuid          NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  liquidacion_id  uuid          REFERENCES public.liquidaciones(id) ON DELETE SET NULL,
  periodo         text,
  fecha           date          NOT NULL,
  tipo            text          NOT NULL,
  categoria       text          NOT NULL DEFAULT 'contractual',
  descripcion     text          NOT NULL DEFAULT '',
  monto           numeric(14,2),
  documento_url   text,
  created_at      timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eventos_contrato ON public.eventos_contrato (contrato_id, fecha);
CREATE INDEX IF NOT EXISTS idx_eventos_periodo  ON public.eventos_contrato (periodo);
