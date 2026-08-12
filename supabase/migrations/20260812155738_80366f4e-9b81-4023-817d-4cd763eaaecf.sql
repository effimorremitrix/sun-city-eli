CREATE TABLE public.site_edit_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'owner',
  label text,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX site_edit_links_site_id_idx ON public.site_edit_links(site_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_edit_links TO authenticated;
GRANT ALL ON public.site_edit_links TO service_role;

ALTER TABLE public.site_edit_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY site_edit_links_select ON public.site_edit_links
  FOR SELECT TO authenticated USING (public.owns_site(site_id));

CREATE POLICY site_edit_links_insert ON public.site_edit_links
  FOR INSERT TO authenticated WITH CHECK (public.owns_site(site_id));

CREATE POLICY site_edit_links_update ON public.site_edit_links
  FOR UPDATE TO authenticated USING (public.owns_site(site_id)) WITH CHECK (public.owns_site(site_id));

CREATE POLICY site_edit_links_delete ON public.site_edit_links
  FOR DELETE TO authenticated USING (public.owns_site(site_id));

CREATE TRIGGER site_edit_links_updated_at
  BEFORE UPDATE ON public.site_edit_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();