ALTER TABLE public.listing_images
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'image'
  CHECK (kind IN ('image', 'video'));