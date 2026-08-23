ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS buy_categories  text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sell_categories text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS leads_buy_categories_idx
  ON public.leads USING gin (buy_categories);
CREATE INDEX IF NOT EXISTS leads_sell_categories_idx
  ON public.leads USING gin (sell_categories);