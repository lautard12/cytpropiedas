
-- Temporary permissive policies for MVP (no auth yet)
CREATE POLICY "Allow all access to propietarios" ON public.propietarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to inquilinos" ON public.inquilinos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to propiedades" ON public.propiedades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contratos" ON public.contratos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to liquidaciones" ON public.liquidaciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to conceptos_liquidacion" ON public.conceptos_liquidacion FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to pagos" ON public.pagos FOR ALL USING (true) WITH CHECK (true);
