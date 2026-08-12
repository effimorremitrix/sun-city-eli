-- roles
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- sites
CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.sites TO authenticated;
GRANT ALL ON public.sites TO service_role;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sites_select_owner_or_admin" ON public.sites FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sites_update_owner_or_admin" ON public.sites FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sites_updated_at BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- owner_id may never be changed by a client (only by service_role / admin)
CREATE OR REPLACE FUNCTION public.protect_site_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id <> OLD.owner_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'owner_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sites_protect_owner BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.protect_site_owner();

-- content
CREATE TABLE public.site_content (
  site_id uuid PRIMARY KEY REFERENCES public.sites(id) ON DELETE CASCADE,
  business jsonb NOT NULL DEFAULT '{}'::jsonb,
  texts jsonb NOT NULL DEFAULT '{}'::jsonb,
  hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  images jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_site(_site_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sites s
    WHERE s.id = _site_id
      AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
$$;

CREATE POLICY "site_content_select" ON public.site_content FOR SELECT TO authenticated
  USING (public.owns_site(site_id));
CREATE POLICY "site_content_insert" ON public.site_content FOR INSERT TO authenticated
  WITH CHECK (public.owns_site(site_id));
CREATE POLICY "site_content_update" ON public.site_content FOR UPDATE TO authenticated
  USING (public.owns_site(site_id)) WITH CHECK (public.owns_site(site_id));

CREATE TRIGGER site_content_updated_at BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- items (products / services / properties)
CREATE TABLE public.site_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'product',
  title text NOT NULL,
  description text,
  price numeric,
  price_note text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX site_items_site_idx ON public.site_items (site_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_items TO authenticated;
GRANT ALL ON public.site_items TO service_role;
ALTER TABLE public.site_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_items_select" ON public.site_items FOR SELECT TO authenticated
  USING (public.owns_site(site_id));
CREATE POLICY "site_items_insert" ON public.site_items FOR INSERT TO authenticated
  WITH CHECK (public.owns_site(site_id));
CREATE POLICY "site_items_update" ON public.site_items FOR UPDATE TO authenticated
  USING (public.owns_site(site_id)) WITH CHECK (public.owns_site(site_id));
CREATE POLICY "site_items_delete" ON public.site_items FOR DELETE TO authenticated
  USING (public.owns_site(site_id));

CREATE TRIGGER site_items_updated_at BEFORE UPDATE ON public.site_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- public read: only safe fields, no owner ids, no table access for anon
CREATE OR REPLACE FUNCTION public.get_public_site(p_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'slug', s.slug,
    'name', s.name,
    'business', COALESCE(c.business, '{}'::jsonb),
    'texts', COALESCE(c.texts, '{}'::jsonb),
    'hours', COALESCE(c.hours, '[]'::jsonb),
    'images', COALESCE(c.images, '{}'::jsonb),
    'settings', COALESCE(c.settings, '{}'::jsonb),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'kind', i.kind, 'title', i.title, 'description', i.description,
        'price', i.price, 'price_note', i.price_note, 'image_url', i.image_url,
        'sort_order', i.sort_order
      ) ORDER BY i.sort_order, i.created_at)
      FROM public.site_items i WHERE i.site_id = s.id AND i.is_active
    ), '[]'::jsonb)
  )
  FROM public.sites s
  LEFT JOIN public.site_content c ON c.site_id = s.id
  WHERE s.slug = p_slug
$$;
GRANT EXECUTE ON FUNCTION public.get_public_site(text) TO anon, authenticated;