-- תיקון ממצאי הביקורת (Codex P1/P2): מודל הסוכנים נשען על owns_site מודע-בעלים,
-- אבל מיגרציה קודמת (20260814100608, "simplify permissions: admin only") דרסה את
-- owns_site לבדיקת אדמין בלבד והחליפה את מדיניות sites למדיניות אדמין-בלבד —
-- כך שסוכן חדש לא רואה את האתר שלו ואף מדיניות שמבוססת על owns_site לא עוברת.
-- בנוסף, מדיניות האחסון של תמונות הנכסים נשארה אדמין-בלבד.

-- 1. owns_site חוזר להיות מודע-בעלים (אדמין תמיד עובר)
CREATE OR REPLACE FUNCTION public.owns_site(_site_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sites s
    WHERE s.id = _site_id
      AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
$$;

-- 2. sites: הבעלים רואה ומעדכן את האתר שלו, אדמין את כולם
DROP POLICY IF EXISTS "sites_admin_select" ON public.sites;
DROP POLICY IF EXISTS "sites_admin_update" ON public.sites;
DROP POLICY IF EXISTS "sites_select_owner_or_admin" ON public.sites;
DROP POLICY IF EXISTS "sites_update_owner_or_admin" ON public.sites;

CREATE POLICY "sites_select_owner_or_admin" ON public.sites
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sites_update_owner_or_admin" ON public.sites
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- הבעלות על אתר לא ניתנת להעברה על ידי הלקוח (רק אדמין / service role)
CREATE OR REPLACE FUNCTION public.protect_site_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id <> OLD.owner_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'owner_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sites_protect_owner ON public.sites;
CREATE TRIGGER sites_protect_owner BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.protect_site_owner();

-- 3. אחסון תמונות: כל מי שמנהל אתר (אדמין או סוכן-בעלים), לא רק אדמין
CREATE OR REPLACE FUNCTION public.is_site_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.sites s WHERE s.owner_id = auth.uid())
$$;

DROP POLICY IF EXISTS listing_images_storage_select ON storage.objects;
DROP POLICY IF EXISTS listing_images_storage_insert ON storage.objects;
DROP POLICY IF EXISTS listing_images_storage_update ON storage.objects;
DROP POLICY IF EXISTS listing_images_storage_delete ON storage.objects;

CREATE POLICY listing_images_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'listing-images' AND public.is_site_manager());
CREATE POLICY listing_images_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-images' AND public.is_site_manager());
CREATE POLICY listing_images_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-images' AND public.is_site_manager())
  WITH CHECK (bucket_id = 'listing-images' AND public.is_site_manager());
CREATE POLICY listing_images_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'listing-images' AND public.is_site_manager());
