
-- Propietarios
CREATE TABLE public.propietarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  cuit TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  banco TEXT NOT NULL DEFAULT '',
  cbu TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inquilinos
CREATE TABLE public.inquilinos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  dni TEXT NOT NULL DEFAULT '',
  garante TEXT NOT NULL DEFAULT '',
  garante_telefono TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Propiedades
CREATE TYPE public.tipo_propiedad AS ENUM ('Departamento', 'Casa', 'Local', 'Oficina', 'PH');
CREATE TYPE public.estado_propiedad AS ENUM ('Ocupada', 'Vacante', 'En refacción');

CREATE TABLE public.propiedades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  direccion TEXT NOT NULL,
  unidad TEXT NOT NULL DEFAULT '',
  tipo tipo_propiedad NOT NULL DEFAULT 'Departamento',
  propietario_id UUID REFERENCES public.propietarios(id) ON DELETE SET NULL,
  estado estado_propiedad NOT NULL DEFAULT 'Vacante',
  contrato_activo_id UUID DEFAULT NULL,
  metros NUMERIC NOT NULL DEFAULT 0,
  ambientes INTEGER NOT NULL DEFAULT 1,
  observaciones TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contratos
CREATE TYPE public.estado_contrato AS ENUM ('Activo', 'Vencido', 'Por vencer', 'Rescindido');

CREATE TABLE public.contratos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  propiedad_id UUID REFERENCES public.propiedades(id) ON DELETE SET NULL,
  propietario_id UUID REFERENCES public.propietarios(id) ON DELETE SET NULL,
  inquilino_id UUID REFERENCES public.inquilinos(id) ON DELETE SET NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado estado_contrato NOT NULL DEFAULT 'Activo',
  alquiler_base NUMERIC NOT NULL DEFAULT 0,
  tipo_ajuste TEXT NOT NULL DEFAULT '',
  frecuencia_ajuste TEXT NOT NULL DEFAULT '',
  dia_vencimiento INTEGER NOT NULL DEFAULT 10,
  -- Reglas contractuales
  comision_porcentaje NUMERIC NOT NULL DEFAULT 10,
  iva BOOLEAN NOT NULL DEFAULT false,
  tgi TEXT NOT NULL DEFAULT 'Inquilino',
  api TEXT NOT NULL DEFAULT 'Inquilino',
  expensas_ordinarias TEXT NOT NULL DEFAULT 'Inquilino',
  expensas_extraordinarias TEXT NOT NULL DEFAULT 'Propietario',
  seguro TEXT NOT NULL DEFAULT 'No aplica',
  servicios TEXT NOT NULL DEFAULT 'Inquilino',
  reglas_observaciones TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from propiedades to contratos now that contratos exists
ALTER TABLE public.propiedades
  ADD CONSTRAINT fk_contrato_activo
  FOREIGN KEY (contrato_activo_id) REFERENCES public.contratos(id) ON DELETE SET NULL;

-- Liquidaciones
CREATE TYPE public.estado_liquidacion AS ENUM ('Borrador', 'Pendiente', 'Parcial', 'Cobrada', 'Transferida');

CREATE TABLE public.liquidaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
  periodo TEXT NOT NULL,
  periodo_label TEXT NOT NULL,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  estado estado_liquidacion NOT NULL DEFAULT 'Borrador',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total_cobrar NUMERIC NOT NULL DEFAULT 0,
  total_cobrado NUMERIC NOT NULL DEFAULT 0,
  pendiente NUMERIC NOT NULL DEFAULT 0,
  comision_inmobiliaria NUMERIC NOT NULL DEFAULT 0,
  neto_propietario NUMERIC NOT NULL DEFAULT 0,
  saldo_anterior NUMERIC NOT NULL DEFAULT 0,
  observaciones TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conceptos de liquidación
CREATE TABLE public.conceptos_liquidacion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  liquidacion_id UUID REFERENCES public.liquidaciones(id) ON DELETE CASCADE NOT NULL,
  concepto TEXT NOT NULL,
  monto NUMERIC NOT NULL DEFAULT 0,
  responsable TEXT NOT NULL DEFAULT 'Inquilino',
  aplica_al_inquilino BOOLEAN NOT NULL DEFAULT true
);

-- Pagos
CREATE TYPE public.medio_pago AS ENUM ('Transferencia', 'Efectivo', 'Cheque', 'Depósito');
CREATE TYPE public.estado_pago AS ENUM ('Confirmado', 'Pendiente', 'Rechazado');

CREATE TABLE public.pagos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  liquidacion_id UUID REFERENCES public.liquidaciones(id) ON DELETE CASCADE NOT NULL,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto NUMERIC NOT NULL DEFAULT 0,
  medio_pago medio_pago NOT NULL DEFAULT 'Transferencia',
  referencia TEXT NOT NULL DEFAULT '',
  estado estado_pago NOT NULL DEFAULT 'Pendiente',
  observaciones TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables (no policies yet since no auth)
ALTER TABLE public.propietarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquilinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propiedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conceptos_liquidacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
