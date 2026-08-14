ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.profiles.full_name IS 'שם תצוגה של המשתמש, מועבר מ-user_metadata בהרשמה';