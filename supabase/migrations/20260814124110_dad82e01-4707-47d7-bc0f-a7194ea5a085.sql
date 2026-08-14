CREATE TABLE public.scout_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT 'סריקת נכסים',
  deal_type text NOT NULL DEFAULT 'מכירה',
  city text NOT NULL DEFAULT 'נתניה',
  neighborhoods text[] NOT NULL DEFAULT '{}'::text[],
  min_price numeric,
  max_price numeric,
  min_rooms numeric,
  min_size numeric,
  needs_mamad boolean NOT NULL DEFAULT false,
  needs_elevator boolean NOT NULL DEFAULT false,
  needs_parking boolean NOT NULL DEFAULT false,
  needs_balcony boolean NOT NULL DEFAULT false,
  sources text[] NOT NULL DEFAULT '{yad2,madlan}'::text[],
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scout_profiles TO authenticated;
GRANT ALL ON public.scout_profiles TO service_role;
ALTER TABLE public.scout_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY scout_profiles_admin_select ON public.scout_profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY scout_profiles_admin_insert ON public.scout_profiles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY scout_profiles_admin_update ON public.scout_profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY scout_profiles_admin_delete ON public.scout_profiles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER scout_profiles_set_updated_at BEFORE UPDATE ON public.scout_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.scout_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_profile_id uuid REFERENCES public.scout_profiles(id) ON DELETE SET NULL,
  source_site text NOT NULL,
  source_url text NOT NULL UNIQUE,
  title text NOT NULL,
  deal_type text,
  price numeric,
  rooms numeric,
  size_sqm numeric,
  neighborhood text,
  address text,
  raw_summary text,
  match_score integer NOT NULL DEFAULT 0,
  match_reason text,
  status text NOT NULL DEFAULT 'new',
  created_listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scout_candidates TO authenticated;
GRANT ALL ON public.scout_candidates TO service_role;
ALTER TABLE public.scout_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY scout_candidates_admin_select ON public.scout_candidates FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY scout_candidates_admin_insert ON public.scout_candidates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY scout_candidates_admin_update ON public.scout_candidates FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY scout_candidates_admin_delete ON public.scout_candidates FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER scout_candidates_set_updated_at BEFORE UPDATE ON public.scout_candidates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX scout_candidates_status_idx ON public.scout_candidates(status, created_at DESC);