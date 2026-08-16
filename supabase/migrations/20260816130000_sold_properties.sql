-- מדור "נמכר על ידינו": דירות שנמכרו, מוצגות באתר כהוכחה חברתית.
-- כל רשומה שייכת ל-site של הסוכן שמכר; התמונות נשמרות באותו bucket של
-- תמונות הנכסים (listing-images) תחת הנתיב sold/.
CREATE TABLE public.sold_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  address text NOT NULL,
  neighborhood text,
  note text,
  image_url text,
  storage_path text,
  sold_at date,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sold_properties TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sold_properties TO authenticated;
GRANT ALL ON public.sold_properties TO service_role;
ALTER TABLE public.sold_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY sold_properties_public_select ON public.sold_properties
  FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY sold_properties_manage_select ON public.sold_properties
  FOR SELECT TO authenticated
  USING (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY sold_properties_manage_insert ON public.sold_properties
  FOR INSERT TO authenticated
  WITH CHECK (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY sold_properties_manage_update ON public.sold_properties
  FOR UPDATE TO authenticated
  USING (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY sold_properties_manage_delete ON public.sold_properties
  FOR DELETE TO authenticated
  USING (public.owns_site(site_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sold_properties_updated_at BEFORE UPDATE ON public.sold_properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX sold_properties_site_id_idx ON public.sold_properties (site_id);
