
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Public read relatorios" ON storage.objects;
CREATE POLICY "Auth read relatorios" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'relatorios');
