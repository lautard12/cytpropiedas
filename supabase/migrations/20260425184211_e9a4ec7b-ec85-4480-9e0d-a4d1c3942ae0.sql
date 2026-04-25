-- Bucket público para activos de la organización (logo, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-assets', 'org-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública
CREATE POLICY "org_assets_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-assets');

-- Subida por usuarios autenticados
CREATE POLICY "org_assets_auth_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'org-assets');

-- Update por autenticados
CREATE POLICY "org_assets_auth_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'org-assets')
WITH CHECK (bucket_id = 'org-assets');

-- Delete por autenticados
CREATE POLICY "org_assets_auth_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'org-assets');
