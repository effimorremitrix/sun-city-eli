CREATE TABLE public.listing_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  storage_path text,
  external_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX listing_images_listing_idx ON public.listing_images (listing_id, sort_order);

GRANT SELECT ON public.listing_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_images TO authenticated;
GRANT ALL ON public.listing_images TO service_role;

ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY listing_images_public_select ON public.listing_images
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.is_published));

CREATE POLICY listing_images_admin_select ON public.listing_images
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY listing_images_admin_insert ON public.listing_images
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY listing_images_admin_update ON public.listing_images
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY listing_images_admin_delete ON public.listing_images
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER listing_images_updated_at BEFORE UPDATE ON public.listing_images
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY listing_images_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'listing-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY listing_images_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY listing_images_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'listing-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY listing_images_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'listing-images' AND public.has_role(auth.uid(), 'admin'));