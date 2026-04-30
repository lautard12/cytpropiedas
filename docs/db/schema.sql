-- ============================================================
-- ESQUEMA DE BASE DE DATOS — C&T Propiedades
-- Generado a partir del estado actual de Lovable Cloud (Supabase)
-- ============================================================

-- ───────── Enums ─────────
CREATE TYPE rol_persona       AS ENUM ('propietario','inquilino','garante');
CREATE TYPE tipo_propiedad    AS ENUM ('Departamento','Casa','Local','Oficina','Cochera','Galpon','Terreno','Otro');
CREATE TYPE estado_propiedad  AS ENUM ('Vacante','Alquilada','Reservada','En refacción','Inactiva');
CREATE TYPE estado_contrato   AS ENUM ('Activo','Vencido','Rescindido','Borrador');
CREATE TYPE estado_liquidacion AS ENUM ('Borrador','Pendiente','Parcial','Cobrada','Transferida','Anulada');
CREATE TYPE estado_pago       AS ENUM ('Pendiente','Confirmado','Anulado');
CREATE TYPE medio_pago        AS ENUM ('Transferencia','Efectivo','Cheque','Mercado Pago','Débito automático');
CREATE TYPE app_role          AS ENUM ('admin','administrativo');

-- ───────── usuarios (espejo público de auth.users) ─────────
CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  nombre text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  ultimo_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX usuarios_email_uidx ON public.usuarios (lower(email));

-- ───────── roles (catálogo) ─────────
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo app_role NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ───────── user_roles (N:M usuarios ↔ roles) ─────────
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  role app_role NOT NULL,                              -- denormalizado, sincronizado por trigger (compat has_role)
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- ───────── personas (datos básicos) ─────────
CREATE TABLE public.personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  dni text NOT NULL DEFAULT '',
  cuit text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  direccion text NOT NULL DEFAULT '',
  observaciones text NOT NULL DEFAULT '',
  user_id uuid,            -- vínculo con auth.users si es usuario interno
  sucursal_id uuid,        -- → sucursales(id)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ───────── propietarios (1-a-1 con personas) ─────────
CREATE TABLE public.propietarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL UNIQUE REFERENCES public.personas(id) ON DELETE CASCADE,
  banco text NOT NULL DEFAULT '',
  cbu text NOT NULL DEFAULT '',
  alias_cbu text NOT NULL DEFAULT '',
  condicion_iva text NOT NULL DEFAULT 'Consumidor Final',
  observaciones_fiscales text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ───────── inquilinos (1-a-1 con personas) ─────────
CREATE TABLE public.inquilinos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ───────── personas_roles (índice de roles) ─────────
CREATE TABLE public.personas_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  rol rol_persona NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(persona_id, rol)
);

-- ───────── propiedades ─────────
CREATE TABLE public.propiedades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direccion text NOT NULL,
  unidad text NOT NULL DEFAULT '',
  tipo tipo_propiedad NOT NULL DEFAULT 'Departamento',
  propietario_id uuid REFERENCES public.propietarios(id) ON DELETE SET NULL,
  estado estado_propiedad NOT NULL DEFAULT 'Vacante',
  contrato_activo_id uuid,
  metros numeric NOT NULL DEFAULT 0,
  ambientes int NOT NULL DEFAULT 1,
  observaciones text NOT NULL DEFAULT '',
  latitud numeric,
  longitud numeric,
  matricula_catastral text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ───────── contratos ─────────
CREATE TABLE public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  propiedad_id uuid REFERENCES public.propiedades(id) ON DELETE SET NULL,
  propietario_id uuid REFERENCES public.propietarios(id) ON DELETE SET NULL,
  inquilino_id uuid REFERENCES public.inquilinos(id) ON DELETE SET NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  estado estado_contrato NOT NULL DEFAULT 'Activo',
  alquiler_base numeric NOT NULL DEFAULT 0,
  tipo_ajuste text NOT NULL DEFAULT '',
  frecuencia_ajuste text NOT NULL DEFAULT '',
  dia_vencimiento int NOT NULL DEFAULT 10,
  comision_porcentaje numeric NOT NULL DEFAULT 10,
  iva boolean NOT NULL DEFAULT false,
  tgi text NOT NULL DEFAULT 'Inquilino',
  api text NOT NULL DEFAULT 'Inquilino',
  expensas_ordinarias text NOT NULL DEFAULT 'Inquilino',
  expensas_extraordinarias text NOT NULL DEFAULT 'Propietario',
  seguro text NOT NULL DEFAULT 'No aplica',
  servicios text NOT NULL DEFAULT 'Inquilino',
  reglas_observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.propiedades
  ADD CONSTRAINT fk_contrato_activo
  FOREIGN KEY (contrato_activo_id) REFERENCES public.contratos(id) ON DELETE SET NULL;

-- ───────── liquidaciones / conceptos / pagos / eventos ─────────
-- (idénticas a versión anterior — sin cambios estructurales)

CREATE TABLE public.liquidaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  periodo text NOT NULL,
  periodo_label text NOT NULL,
  fecha_emision date NOT NULL DEFAULT CURRENT_DATE,
  estado estado_liquidacion NOT NULL DEFAULT 'Borrador',
  subtotal numeric NOT NULL DEFAULT 0,
  total_cobrar numeric NOT NULL DEFAULT 0,
  total_cobrado numeric NOT NULL DEFAULT 0,
  pendiente numeric NOT NULL DEFAULT 0,
  comision_inmobiliaria numeric NOT NULL DEFAULT 0,
  neto_propietario numeric NOT NULL DEFAULT 0,
  saldo_anterior numeric NOT NULL DEFAULT 0,
  observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conceptos_liquidacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id uuid NOT NULL REFERENCES public.liquidaciones(id) ON DELETE CASCADE,
  concepto text NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  responsable text NOT NULL DEFAULT 'Inquilino',
  aplica_al_inquilino boolean NOT NULL DEFAULT true
);

CREATE TABLE public.pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id uuid NOT NULL REFERENCES public.liquidaciones(id) ON DELETE CASCADE,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  monto numeric NOT NULL DEFAULT 0,
  medio_pago medio_pago NOT NULL DEFAULT 'Transferencia',
  referencia text NOT NULL DEFAULT '',
  estado estado_pago NOT NULL DEFAULT 'Pendiente',
  observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.eventos_contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  liquidacion_id uuid REFERENCES public.liquidaciones(id) ON DELETE SET NULL,
  periodo text,
  fecha date NOT NULL,
  tipo text NOT NULL,
  categoria text NOT NULL DEFAULT 'contractual',
  descripcion text NOT NULL DEFAULT '',
  monto numeric,
  documento_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
