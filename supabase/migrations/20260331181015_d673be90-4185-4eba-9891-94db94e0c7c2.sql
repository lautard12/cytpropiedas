
-- MVP only — restrict RLS for production
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

ALTER TABLE public.eventos_contrato ENABLE ROW LEVEL SECURITY;

-- MVP only — public access for demo
CREATE POLICY "Allow all access to eventos_contrato"
  ON public.eventos_contrato
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
