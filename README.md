# Midnight

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Midnight is a platform for free novels, manga and anime from independent creators. Readers browse, read, rate, review and comment; creators publish stories (including choose-your-own-adventure stories with branching chapters); admins moderate through reports, takedowns, warnings and timeouts.

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript (strict), Tailwind CSS, Radix UI / shadcn, React Router, Quill editor |
| Backend API | Node.js, Express, TypeScript, Zod validation, Puppeteer (PDF export), epub-gen-memory |
| Database & auth | Supabase (Postgres + Row Level Security, Auth with hCaptcha bot protection and TOTP 2FA, Storage) |
| Tests & CI | Vitest (unit + live API tests), GitHub Actions |

Most reads and simple writes go straight from the browser to Supabase and are protected by RLS policies and database triggers. Privileged or multi-step actions (admin moderation, reports, warnings/timeouts, exports, view counting, the image proxy) go through the Express API, which uses the service-role key and is the only place that key may exist.

## Project layout

```
backend/            Express API — src/app.ts (app), index.ts (listen), src/routes, src/utils
  tests/unit        no-network unit tests (npm test)
  tests/live        live tests against Supabase (npm run test:live)
frontend/           React app — src/pages, src/components, src/lib/api.ts (all API calls)
migration*.sql      database schema and policies, run in order (see below)
AGENTS.md           conventions and gotchas for contributors / coding agents
```

## Setup

### Prerequisites
- Node.js 22+
- A Supabase project
- An hCaptcha account (site key + secret key)

### 1. Database
In the Supabase SQL editor run, **in order** (each file is safe to re-run):

1. `migration.sql`
2. `migration_002_fixes.sql`
3. `migration_003_security.sql`
4. `migration_004_moderation.sql`
5. `migration_005_reports.sql`
6. `migration_006_cyoa_uploads.sql`
7. `migration_007_mfa.sql`

Then make yourself an admin:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'you@example.com';
```

In the Supabase dashboard, enable **Authentication → Bot Protection** with your hCaptcha **secret** key. TOTP MFA is enabled by default.

### 2. Backend
```bash
cd backend
npm install --ignore-scripts
cp .env.example .env          # fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGINS
npx puppeteer browsers install chrome-headless-shell   # once per machine, for PDF export
npm run dev                   # http://localhost:<PORT> (PORT in .env, default 3001)
```

### 3. Frontend
```bash
cd frontend
npm install --ignore-scripts
cp .env.example .env          # VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_HCAPTCHA_SITE_KEY,
                              # VITE_API_URL = backend origin, e.g. http://localhost:3001 (must match backend PORT)
npm run dev                   # http://localhost:8080
```

`ALLOWED_ORIGINS` in `backend/.env` must include the frontend origin (`http://localhost:8080` in development).

## Testing

```bash
cd backend && npm test          # unit tests
cd backend && npm run test:live # real API + Supabase, throwaway users that are deleted afterwards
cd frontend && npm test         # unit tests
```

Live tests create and delete test users, stories, reports and uploads in the configured Supabase project — point them at a development project. CI (`.github/workflows/ci.yml`) runs type checks, builds, unit tests and a check that no service-role key ends up in the frontend build.

## Deploying

- Set `NODE_ENV=production` (hides internal error details from API responses).
- Set `TRUST_PROXY` to the number of reverse proxies in front of the API (e.g. `1` behind Cloudflare, nginx or Render) so rate limits and view counting see real visitor IPs.
- Install `chrome-headless-shell` on the server (see above).
- Rate limits are kept in memory. That's fine for a single API instance; if you run several, move them to a shared store such as Redis.
- Never put `SUPABASE_SERVICE_ROLE_KEY` in the frontend `.env`.

## Moderation model

- **Post-moderation:** creators publish directly; content is reviewed when users report it.
- **Reports** (`POST /api/reports`): validated, rate-limited, de-duplicated. Admins can open the reported content, take it down (creators can't republish it), warn or time out the reported user or the reporter.
- **Warnings and timeouts** are delivered to users as notifications, a site banner and the `/notices` page. A timeout blocks posting, commenting, rating, reporting, uploads and edits until it ends; reading still works.

## License

MIT — see [LICENSE](LICENSE).
