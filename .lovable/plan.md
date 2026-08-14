# סוכן סריקת נכסים ל-ADMIN

קונספט שונה לחלוטין מהסוכן של משתמש רגיל:
- **משתמש רגיל**: מקבל התראות על נכסים שקיימים באתר סאן סיטי ומתאימים לפרופיל שלו.
- **ADMIN**: סוכן שסורק את האינטרנט (יד2, מדלן, אתרי נדל"ן) ומציע לו נכסים חדשים בנתניה להעלאה לאתר — כתור מועמדים לאישור.

## איך זה יעבוד

1. **קריטריונים לסריקה** (טאב חדש "סוכן סריקה" ב-/admin): ADMIN מגדיר פרופילי סריקה — סוג עסקה, שכונות, טווח מחירים, מינימום חדרים/מ"ר, מאפיינים (ממ"ד/מעלית/חניה), ואתרי מקור לחיפוש. אפשר להגדיר כמה פרופילים ולהפעיל/לכבות כל אחד.
2. **סריקה**: הסוכן מריץ חיפוש אינטרנט אמיתי דרך Anthropic (עם המפתח שלך) ומחזיר מועמדים עם **קישור מקור חובה**. ללא URL אמיתי — המועמד נזרק. שדה שלא נמצא במקור מוצג "אין מידע" (בהתאם לכלל אי-המצאת נתונים).
3. **תור מועמדים**: כל מועמד נשמר עם כותרת, מחיר, חדרים, מ"ר, שכונה, אתר מקור, קישור, ציון התאמה וסיבת ההתאמה. כפילויות (אותו URL) לא נכנסות שוב.
4. **אישור/דחייה**: לכל מועמד כפתורי "אישור → צור טיוטת נכס" ו-"דחייה". אישור יוצר רשומה ב-`listings` עם `is_published=false`, ממולאת מנתוני המועמד, ואז ADMIN עובר לטאב נכסים לעריכה, הוספת תמונות ופרסום. אין פרסום אוטומטי לאתר.
5. **תדירות**: סריקה אוטומטית פעם ביום לכל פרופיל פעיל + כפתור "סרוק עכשיו". מועמדים חדשים מסומנים כלא-נקראו ומופיעים כמונה על הטאב.
6. **שקיפות ועלות**: כל סריקה נרשמת ב-`ai_usage_events` תחת feature `admin_scout`, כך שהעלות מופיעה בטאב "שימוש" הקיים.

## מה ADMIN יראה

טאב חדש `/admin` → "סוכן סריקה", עם:
- כרטיס הגדרת קריטריונים (עריכה/הוספה/מחיקה של פרופיל סריקה).
- כפתור "סרוק עכשיו" עם אינדיקציית התקדמות.
- רשימת מועמדים: כרטיסים עם נתוני הנכס, תג אתר מקור, קישור "צפה במקור" (טאב חדש), ציון התאמה, וכפתורי אישור/דחייה.
- מסננים: חדשים / אושרו / נדחו.

## פרטים טכניים

**Database (מיגרציה אחת):**
- `scout_profiles` — קריטריוני סריקה של ADMIN: label, deal_type, city, neighborhoods[], min/max_price, min_rooms, min_size, needs_* , sources[] (yad2/madlan/other), is_active, timestamps. RLS: קריאה/כתיבה ל-`has_role(auth.uid(),'admin')` בלבד + GRANT ל-authenticated/service_role.
- `scout_candidates` — מועמדים: scout_profile_id, source_site, source_url (UNIQUE), title, price, rooms, size_sqm, neighborhood, address, raw_summary, match_score, match_reason, status ('new'|'approved'|'rejected'), created_listing_id, seen_at, timestamps. RLS: admin בלבד. GRANT זהה.
- טריגר `set_updated_at` על שתי הטבלאות.

**Backend:**
- `src/lib/scout.server.ts` — קריאה ל-Anthropic Messages API עם כלי `web_search_20250305`, בניית שאילתות לפי הפרופיל (כולל `site:yad2.co.il` / `site:madlan.co.il`), פרסינג ו-sanitize קשיח: URL חייב להיות http(s) ומדומיין מוכר; מחיר/חדרים/מ"ר רק אם מספריים; כל השאר null. רישום usage עם feature `admin_scout`.
- `src/lib/scout.functions.ts` — server functions עם `requireSupabaseAuth` + בדיקת `has_role` admin: `listScoutProfiles`, `saveScoutProfile`, `deleteScoutProfile`, `runScout` (סריקה + upsert מועמדים לפי source_url), `listCandidates`, `setCandidateStatus`, `approveCandidate` (יוצר listing כטיוטה ומחזיר id).
- `src/routes/api/public/scout-cron.ts` — server route ל-POST עם `x-cron-secret` (סוד חדש `SCOUT_CRON_SECRET`) שמריץ סריקה לכל פרופיל פעיל. יתוזמן פעם ביום דרך cron על ה-URL היציב של הפרויקט.

**Frontend:**
- `src/components/site/AdminScout.tsx` — טופס קריטריונים + רשימת מועמדים + פעולות, בעברית RTL, בסגנון הטאבים הקיימים ב-/admin.
- `src/routes/_authenticated/admin.tsx` — הוספת טאב `scout` בלבד; שאר הטאבים לא נוגעים.

**כללים שנשמרים:** אין המצאת נתונים — כל מועמד עם קישור מקור אמיתי; שדה חסר = "אין מידע"; אין כפתור מת; לא נוגעים בסוכן האישי של המשתמש הרגיל.
