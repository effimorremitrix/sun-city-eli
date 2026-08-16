-- Phase 2: AI translations of listing title/description to en/fr/ru.
-- source_hash marks the Hebrew source that was translated, so a listing is
-- re-translated only when its title/description actually changed.
CREATE TABLE public.listing_translations (
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  lang text NOT NULL CHECK (lang IN ('en', 'fr', 'ru')),
  title text NOT NULL,
  description text,
  source_hash text NOT NULL,
  translated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, lang)
);

GRANT SELECT ON public.listing_translations TO anon, authenticated;
GRANT ALL ON public.listing_translations TO service_role;
ALTER TABLE public.listing_translations ENABLE ROW LEVEL SECURITY;

-- תרגומים של נכסים מפורסמים גלויים לכולם (כמו הנכס עצמו)
CREATE POLICY listing_translations_public_select ON public.listing_translations
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_id AND l.is_published
  ));
