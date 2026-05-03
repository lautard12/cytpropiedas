
-- Enums nuevos
DO $$ BEGIN
  CREATE TYPE tipo_contrato AS ENUM ('Vivienda','Comercial','Temporario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE moneda AS ENUM ('ARS','USD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE indice_ajuste AS ENUM ('ICL','IPC','Libre acuerdo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Contratos: nuevas columnas
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS tipo_contrato tipo_contrato NOT NULL DEFAULT 'Vivienda',
  ADD COLUMN IF NOT EXISTS moneda moneda NOT NULL DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS indice_ajuste indice_ajuste NOT NULL DEFAULT 'ICL',
  ADD COLUMN IF NOT EXISTS clausulas_particulares text NOT NULL DEFAULT '';

-- Backfill índice de ajuste a partir de tipo_ajuste viejo
UPDATE public.contratos
   SET indice_ajuste = CASE
     WHEN tipo_ajuste ILIKE 'ICL%' THEN 'ICL'::indice_ajuste
     WHEN tipo_ajuste ILIKE 'IPC%' THEN 'IPC'::indice_ajuste
     ELSE 'Libre acuerdo'::indice_ajuste
   END
 WHERE tipo_ajuste IS NOT NULL AND tipo_ajuste <> '';

-- Liquidaciones: moneda
ALTER TABLE public.liquidaciones
  ADD COLUMN IF NOT EXISTS moneda moneda NOT NULL DEFAULT 'ARS';

UPDATE public.liquidaciones l
   SET moneda = c.moneda
  FROM public.contratos c
 WHERE l.contrato_id = c.id;

-- Pagos: moneda + cotización (si el pago se realiza en moneda distinta a la del contrato)
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS moneda moneda NOT NULL DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS cotizacion numeric;

UPDATE public.pagos p
   SET moneda = c.moneda
  FROM public.contratos c
 WHERE p.contrato_id = c.id;
