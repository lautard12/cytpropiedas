-- Plantillas de contrato
CREATE TABLE public.plantillas_contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_contrato NOT NULL,
  nombre text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  clausulas text NOT NULL DEFAULT '',
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plantillas_contrato ENABLE ROW LEVEL SECURITY;

CREATE POLICY plantillas_auth_select ON public.plantillas_contrato
  FOR SELECT TO authenticated USING (true);
CREATE POLICY plantillas_admin_ins ON public.plantillas_contrato
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY plantillas_admin_upd ON public.plantillas_contrato
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY plantillas_admin_del ON public.plantillas_contrato
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_plantillas_updated
  BEFORE UPDATE ON public.plantillas_contrato
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cotizaciones USD
CREATE TYPE tipo_cotizacion AS ENUM ('Oficial','MEP','Blue','CCL');

CREATE TABLE public.cotizaciones_usd (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  tipo tipo_cotizacion NOT NULL DEFAULT 'Oficial',
  valor_compra numeric(14,4) NOT NULL DEFAULT 0,
  valor_venta numeric(14,4) NOT NULL,
  fuente text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fecha, tipo)
);

ALTER TABLE public.cotizaciones_usd ENABLE ROW LEVEL SECURITY;

CREATE POLICY cotiz_auth_select ON public.cotizaciones_usd
  FOR SELECT TO authenticated USING (true);
CREATE POLICY cotiz_admin_ins ON public.cotizaciones_usd
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY cotiz_admin_upd ON public.cotizaciones_usd
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY cotiz_admin_del ON public.cotizaciones_usd
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_cotiz_fecha ON public.cotizaciones_usd(fecha DESC);

-- Plantillas iniciales
INSERT INTO public.plantillas_contrato (tipo, nombre, descripcion, clausulas) VALUES
('Vivienda','Vivienda estándar (Ley 27.551)','Plantilla base para alquileres de vivienda con ajuste ICL.','PRIMERA: El destino exclusivo del inmueble será vivienda familiar del LOCATARIO.
SEGUNDA: El plazo de locación es de 36 meses según Ley 27.551.
TERCERA: El ajuste se realizará conforme al índice ICL publicado por el BCRA.
CUARTA: El LOCATARIO entrega un mes de depósito en garantía, reintegrable al finalizar el contrato.
QUINTA: Los servicios (luz, gas, agua, internet) y expensas ordinarias estarán a cargo del LOCATARIO.'),
('Comercial','Comercial estándar','Plantilla base para alquileres comerciales con ajuste IPC.','PRIMERA: El destino del inmueble será exclusivamente comercial, rubro a declarar.
SEGUNDA: El plazo de locación es de 36 meses prorrogables.
TERCERA: El ajuste se realizará conforme al índice IPC publicado por el INDEC.
CUARTA: El LOCATARIO se obliga a mantener vigentes las habilitaciones municipales correspondientes.
QUINTA: Las mejoras realizadas quedarán en beneficio del inmueble sin derecho a reembolso.'),
('Temporario','Temporario amoblado','Plantilla base para alquileres temporarios amoblados.','PRIMERA: El presente contrato es de carácter temporario y por plazo menor a tres meses.
SEGUNDA: El inmueble se entrega completamente amoblado según inventario adjunto.
TERCERA: El precio incluye servicios básicos salvo indicación expresa.
CUARTA: No corresponde aplicar ajustes durante la vigencia del contrato.
QUINTA: El LOCATARIO se hace responsable por daños al mobiliario y entregará depósito de garantía.');