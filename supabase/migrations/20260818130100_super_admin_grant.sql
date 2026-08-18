-- תפקיד "מנהל ראשי" — שלב 2: הענקה לכל מי שמחזיק כיום בתפקיד admin (כיום — אלי בלבד).
-- שים לב: לא נוגעים באף מדיניות RLS — כולן ממשיכות לבדוק has_role('admin').
-- super_admin הוא שער אפליקטיבי בלבד (טאב משתמשים, שימוש, סוכן סריקה, הוספת סוכנים),
-- ובעל התפקיד ממשיך להחזיק גם ב-admin.
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'super_admin'::public.app_role
FROM public.user_roles
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;
