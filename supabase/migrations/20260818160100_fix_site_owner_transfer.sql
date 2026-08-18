-- protect_site_owner נועד לחסום העברת בעלות על אתר "על ידי הלקוח (רק אדמין / service role)",
-- אבל המימוש בדק רק has_role(auth.uid(), 'admin'). ב-service role (וכן במיגרציות)
-- auth.uid() הוא NULL, ולכן has_role מחזיר false והטריגר חסם גם את קוד השרת המהימן:
--   * מחיקת סוכן (users.functions.ts) שמעבירה את האתר שלו לאדמין המוחק — נכשלה,
--   * ומסירת דף סוכן שנזרע למשתמש שנרשם — הייתה נכשלת גם היא.
-- כאן מיישרים את המימוש עם הכוונה המקורית: פנייה ללא משתמש מזוהה היא קוד שרת מהימן.
CREATE OR REPLACE FUNCTION public.protect_site_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'owner_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
