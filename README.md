# Sun City Real Estate — סאן סיטי נדל"ן

Marketing and listings website for **Sun City Real Estate (סאן סיטי נדל"ן)**, a real-estate agency in Netanya, Israel ("מחברים בין אנשים לנכסים" — selling, buying, and renting properties in Netanya and the surrounding area).

**Live app**: https://sun-city-eli.lovable.app

## What's in the site

- **Hebrew-first, fully RTL** public site with sections for property listings, sellers (free valuation), buyers, services, team, testimonials, and contact — plus a floating WhatsApp button, mobile action bar, and accessibility widget.
- **Multi-language support** (עברית / English / Français / Русский) with `{-$lang}` URL prefixes, a flag language switcher in the header, correct RTL/LTR handling, and localized SEO metadata.
- **AI property search**: converts a free-text request in Hebrew into structured listing filters (deal type, neighborhoods, price, rooms, mamad/elevator/parking/balcony) — filters only, no invented data.
- **Personal area** with Supabase authentication (account settings, password reset).
- **Admin area** for managing listings and their images, users, leads, per-language translation editing with AI auto-translation from Hebrew, AI usage tracking, and **Scout** — an agent that searches the web for real listing candidates matching saved search profiles.

## Tech stack

- [React 19](https://react.dev) + [TanStack Start / Router](https://tanstack.com/start) (file-based routes in `src/routes`)
- [Vite](https://vite.dev) + [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Radix primitives in `src/components/ui`)
- [Supabase](https://supabase.com) — database, auth, and SQL migrations (`supabase/migrations`)
- [TanStack Query](https://tanstack.com/query), [react-hook-form](https://react-hook-form.com) + [zod](https://zod.dev)

## Project structure

```
src/
  components/site/   # Site sections (Hero, PropertySection, Team, …) and admin panels
  components/ui/     # shadcn/ui primitives
  lib/               # Server functions, listings, leads, AI search, Scout, translations
  lib/i18n/          # Dictionaries: he (source of truth), en, fr, ru + SEO strings
  routes/            # TanStack file-based routes ({-$lang} public site, _authenticated area, api)
  integrations/      # Supabase clients and auth middleware
supabase/            # Supabase config and migrations
```

## Development

Requires [Bun](https://bun.sh) (or Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
git clone <this-repository-url>
cd sun-city-eli
bun install   # or: npm i
bun run dev   # or: npm run dev
```

Other scripts: `build`, `preview`, `lint`, `format`.

## Build with Lovable

This project was built with [Lovable](https://lovable.dev). Continue developing it in the [Lovable editor](https://lovable.dev/projects/fa1ddeb7-276a-43f9-9a11-88bf6cf82b41).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## התראות וואטסאפ — WhatsApp Business API

התראות הוואטסאפ ללקוחות, לסוכנים ולמנהל הראשי נשלחות דרך הערוץ הרשמי של מטא.
ללא ספק מוגדר — המערכת ממשיכה לעבוד רגיל (התראות באתר ובמייל בלבד).

שני ספקים נתמכים, לבחירה ב-`WHATSAPP_PROVIDER`:

- `greenapi-waba` — אינסטנס מסוג **WABA** ב-[green-api.com](https://green-api.com) (לא האינסטנס עם ה-QR).
- `meta` — [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) ישירות.

> האינסטנס הישן מסוג Standard (חיבור בסריקת QR) **אינו נתמך יותר**. הוא למעשה
> WhatsApp Web מאוטומט: מטא לא מכירה בו כערוץ עסקי, וכל שליחה יזומה חושפת את
> מספר המשרד לחסימה.

### שליחה יזומה = תבנית מאושרת בלבד

בערוץ הרשמי אי אפשר לשלוח טקסט חופשי ביוזמת העסק למי שלא כתב לנו ב-24 השעות
האחרונות. כל שלוש ההתראות של האתר הן יזומות, ולכן כולן נשלחות כתבניות מאושרות
מראש שאליהן מוזרקים פרמטרים. הנוסחים וסדר הפרמטרים מוגדרים ב-
`src/lib/whatsapp-templates.ts` — זה מקור האמת, ומשם מעתיקים את הגוף למסך
ההגשה.

שלוש התבניות (שפה `he`):

| מפתח                 | שם במטא                  | קטגוריה   | מתי נשלחת                             |
| -------------------- | ------------------------ | --------- | ------------------------------------- |
| `new_listing_client` | `sun_city_new_listing`   | MARKETING | לקוח שפרופיל החיפוש שלו תואם לנכס חדש |
| `agent_matches`      | `sun_city_agent_matches` | UTILITY   | לסוכן שפרסם את הנכס                   |
| `admin_copy`         | `sun_city_admin_copy`    | UTILITY   | עותק למספר המשרד הראשי                |

בעת עריכת נוסח יש לשמור על כללי מטא: הגוף לא מתחיל ולא מסתיים במשתנה, אין שני
משתנים צמודים, המספור רציף מ-`{{1}}`, ופרמטר לא יכול להכיל שורה חדשה, טאב או
4 רווחים רצופים (הנרמול ב-`sanitizeParam` דואג לצד הקוד).

### משתני סביבה

הסודות עצמם נשמרים בלוח משתני הסביבה של Lovable/Cloudflare, לא בקובץ בריפו.

```
WHATSAPP_PROVIDER=greenapi-waba        # או: meta — ריק = no-op שקט
WA_TEMPLATE_LANG=he                    # אופציונלי, meta בלבד

# מזהי התבניות — ב-GREEN-API זה ה-templateId (UUID), במטא זה שם התבנית
WA_TEMPLATE_NEW_LISTING=<id>
WA_TEMPLATE_AGENT_MATCHES=<id>
WA_TEMPLATE_ADMIN_COPY=<id>

# greenapi-waba
GREEN_API_ID=<idInstance>
GREEN_API_TOKEN=<apiTokenInstance>
GREEN_API_BASE_URL=https://xxxx.api.greenapi.com   # ה-ApiUrl המדויק של האינסטנס

# meta
META_WABA_PHONE_NUMBER_ID=<phone number id>
META_WABA_TOKEN=<system user token קבוע>
META_WABA_ID=<waba id>                 # לרשימת התבניות/אבחון בלבד
META_GRAPH_VERSION=v25.0               # אופציונלי

# אבחון (אופציונלי, אפשר להסיר אחרי העלייה לאוויר)
WHATSAPP_DEBUG_SECRET=<מחרוזת אקראית>
```

`META_WABA_*` הם משתנים נפרדים מ-`META_APP_ID` / `META_APP_SECRET` של אפליקציית
הפייסבוק — אלה שני דברים שונים ואין לערבב ביניהם.

### הקמה חד-פעמית

**מטא (`meta`)**

1. Meta Business Manager — אימות העסק, הוספת מספר השליחה ואימותו, ושמירת ה-`phone_number_id` וה-WABA ID.
2. Business Settings → System Users — יצירת משתמש מערכת, שיוך נכס ה-WABA, והנפקת טוקן **קבוע** עם `whatsapp_business_messaging` ו-`whatsapp_business_management`.
3. WhatsApp Manager → Message Templates — יצירת שלוש התבניות (הדבקת הגוף מ-`whatsapp-templates.ts`, שפה עברית, קטגוריה, מילוי ערכי הדוגמה) והמתנה לאישור.
4. הזנת **שמות** התבניות ב-`WA_TEMPLATE_*`.

**GREEN-API (`greenapi-waba`)**

1. יצירת אינסטנס מסוג **WABA** והשלמת תהליך ה-embedded signup מול מטא.
2. העתקת `idInstance`, `apiTokenInstance` וה-`ApiUrl` המדויק של האינסטנס.
3. יצירת אותן שלוש תבניות בקונסולה (הן עוברות לאישור מטא בכל מקרה).
4. שליפת ה-UUID של כל תבנית (ראו אבחון למטה) והזנתו ב-`WA_TEMPLATE_*`.

> **חשוב לדעת לפני ההקמה:** מספר שנרשם כמספר שליחה של WABA **לא יכול לשמש יותר
> באפליקציית הוואטסאפ הרגילה**. מומלץ לרשום מספר נפרד להתראות ולהשאיר את מספר
> המשרד שבקישורי ה-`wa.me` באתר על האפליקציה הרגילה.

### אבחון

הנתיב `/api/public/whatsapp-check` מוגן בכותרת `x-wa-secret` ורץ בסביבה עם
משתני הסביבה האמיתיים:

```sh
# מה מוגדר, ומה מצב האישור של התבניות אצל הספק
curl -H "x-wa-secret: $WHATSAPP_DEBUG_SECRET" https://<site>/api/public/whatsapp-check

# שליחת בדיקה אחת עם ערכי הדוגמה של התבנית
curl -X POST -H "x-wa-secret: $WHATSAPP_DEBUG_SECRET" -H "content-type: application/json" \
  -d '{"to":"0501234567","key":"new_listing_client"}' \
  https://<site>/api/public/whatsapp-check
```

הערה: `waSent` בהודעת השמירה של נכס אומר שהספק **קיבל** את ההודעה, לא שהיא
נמסרה — אין באתר webhook נכנס, ולכן כשל מסירה (מספר שאינו בוואטסאפ, לקוח
שחסם) אינו נראה. תבנית שטרם אושרה או מזהה שגוי כן ייספרו כ"נכשלו" בהודעת
השמירה ויירשמו ללוג עם קוד השגיאה של הספק.
