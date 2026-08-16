-- Phase 4: Facebook publishing per agent site.
-- facebook_connections: page + ad account tokens per site. The page token is
-- read ONLY server-side (service role); no select policy is granted to
-- authenticated users so it can never leak to the browser.
CREATE TABLE public.facebook_connections (
  site_id uuid PRIMARY KEY REFERENCES public.sites(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  page_name text NOT NULL,
  page_access_token text NOT NULL,
  ad_account_id text,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.facebook_connections TO service_role;
ALTER TABLE public.facebook_connections ENABLE ROW LEVEL SECURITY;
-- אין מדיניות ל-authenticated בכוונה: הטוקן נקרא רק בשרת דרך service_role

-- listing_posts: publication log per listing (page post / campaign / manual)
CREATE TABLE public.listing_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  target text NOT NULL CHECK (target IN ('page', 'campaign', 'manual')),
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  fb_post_id text,
  fb_campaign_id text,
  error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listing_posts TO authenticated;
GRANT ALL ON public.listing_posts TO service_role;
ALTER TABLE public.listing_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY listing_posts_manage_select ON public.listing_posts
  FOR SELECT TO authenticated USING (public.owns_listing(listing_id));

-- facebook_groups: the agent's saved real-estate groups for the manual flow
CREATE TABLE public.facebook_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.facebook_groups TO authenticated;
GRANT ALL ON public.facebook_groups TO service_role;
ALTER TABLE public.facebook_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY facebook_groups_manage_select ON public.facebook_groups
  FOR SELECT TO authenticated USING (public.owns_site(site_id));
CREATE POLICY facebook_groups_manage_insert ON public.facebook_groups
  FOR INSERT TO authenticated WITH CHECK (public.owns_site(site_id));
CREATE POLICY facebook_groups_manage_delete ON public.facebook_groups
  FOR DELETE TO authenticated USING (public.owns_site(site_id));

-- נוסחי פוסט מוכנים לכל נכס (נוצרים ב-AI ונשמרים לשימוש חוזר)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS post_copy jsonb;
