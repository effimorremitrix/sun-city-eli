-- נכסים: מחסן (כן/לא + כמות) ומספר חניות.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS has_storage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS storage_count integer,
  ADD COLUMN IF NOT EXISTS parking_count integer;
