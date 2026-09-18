ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS interest_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_signal_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_signal_label text,
  ADD COLUMN IF NOT EXISTS last_signal_title text;

COMMENT ON COLUMN public.leads.interest_count IS 'כמה פעמים הלקוח הרים יד על נכס: "מעניין אותי", "רוצה שסוכן יחזור אליי" ותגובה להתראת נכס. מונה חום, לא מונה נכסים — נכס שסומן פעמיים נספר פעמיים.';
COMMENT ON COLUMN public.leads.last_signal_at IS 'מתי הלקוח סימן עניין בפעם האחרונה. updated_at מייצג כל נגיעה בליד (גם של הסוכן); כאן רק פעולות הלקוח.';
COMMENT ON COLUMN public.leads.last_signal_label IS 'הסימון האחרון כלשונו ("מעניין אותי" / "רוצה שסוכן יחזור אליי" / תגובה להתראה).';
COMMENT ON COLUMN public.leads.last_signal_title IS 'הנכס שעליו היה הסימון האחרון. חשוב במיוחד למודעות שוק: listing_id נשאר ריק עבורן כי הוא מצביע על listings בלבד.';

CREATE INDEX IF NOT EXISTS leads_site_last_signal_idx
  ON public.leads (site_id, last_signal_at DESC NULLS LAST);

ALTER TABLE public.leads DISABLE TRIGGER leads_set_updated_at;

WITH agg AS (
  SELECT lead_id, count(*) AS cnt, max(created_at) AS last_at
    FROM public.lead_events
   WHERE event_type = 'client_response'
   GROUP BY lead_id
), latest AS (
  SELECT DISTINCT ON (lead_id)
         lead_id,
         substring(note FROM 'סימן "([^"]*)"') AS label,
         substring(note FROM 'על הנכס: (.*)$') AS title
    FROM public.lead_events
   WHERE event_type = 'client_response'
   ORDER BY lead_id, created_at DESC
)
UPDATE public.leads l
   SET interest_count = agg.cnt,
       last_signal_at = agg.last_at,
       last_signal_label = latest.label,
       last_signal_title = latest.title
  FROM agg
  LEFT JOIN latest ON latest.lead_id = agg.lead_id
 WHERE l.id = agg.lead_id;

ALTER TABLE public.leads ENABLE TRIGGER leads_set_updated_at;

CREATE OR REPLACE FUNCTION public.bump_lead_signal(
  p_lead_id uuid,
  p_label text,
  p_title text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
     SET interest_count = interest_count + 1,
         last_signal_at = now(),
         last_signal_label = left(p_label, 80),
         last_signal_title = left(p_title, 200)
   WHERE id = p_lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_lead_signal(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_lead_signal(uuid, text, text) TO service_role;