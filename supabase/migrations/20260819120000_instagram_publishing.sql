-- אינסטגרם: מזהה חשבון ה-Instagram Business המקושר לעמוד הפייסבוק של האתר.
-- נשמר בזמן חיבור הפייסבוק (OAuth) ומשמש לפרסום אוטומטי של פוסט "נמכר".
ALTER TABLE public.facebook_connections
  ADD COLUMN IF NOT EXISTS ig_user_id text;

-- יומן הפרסומים: יעד חדש 'instagram' לפוסט "נמכר" שמתפרסם דרך ה-Graph API
ALTER TABLE public.listing_posts
  DROP CONSTRAINT IF EXISTS listing_posts_target_check;
ALTER TABLE public.listing_posts
  ADD CONSTRAINT listing_posts_target_check
  CHECK (target IN ('page', 'campaign', 'manual', 'instagram'));
