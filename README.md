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
