# Midnight — agent notes

## Layout
- `backend/` Express + TypeScript API. Entry: `backend/index.ts`. Port comes from `PORT` in `backend/.env` (currently 3000; code default 3001).
- `frontend/` React + Vite (port 8080). All backend calls go through `frontend/src/lib/api.ts`; `VITE_API_URL` in `frontend/.env` must match the backend port.
- Supabase is the DB/auth. Schema = `migration.sql`, then `migration_002_fixes.sql`, `migration_003_security.sql`, `migration_004_moderation.sql`, `migration_005_reports.sql`, `migration_006_cyoa_uploads.sql`, `migration_007_mfa.sql` (run in order in the Supabase SQL editor; all idempotent).

## Verify
- Backend: `cd backend && npx tsc --noEmit && npm run build` (outputs `dist/index.js`).
- Frontend: `cd frontend && npx tsc --noEmit -p tsconfig.app.json && npx vite build` (delete `frontend/dist` afterwards), `npm test` (vitest).
- Run backend locally: `cd backend && npm run dev` (or `node dist/index.js`).

## Conventions / gotchas
- DB types: `frontend/src/integrations/supabase/types.ts` is the source; `backend/src/types/database.ts` is a copy — keep them in sync after schema changes.
- `stories.created_by`, `reports.reporter_id`, `reviews.user_id`, etc. reference `auth.users`, not `profiles`; PostgREST can't embed `profiles(...)` on them — look profiles up separately (see `attachProfiles` in `backend/src/routes/admin.ts`).
- Roles: users can have multiple `user_roles` rows; use `getUserRoles` / `requireAnyRole` in `backend/src/middleware/auth.ts`.
- Server-side fetches of user-supplied URLs must use `backend/src/utils/safeFetch.ts` (SSRF protection).
- Backend routes: wrap handlers in `asyncHandler`, validate with `parse(schema, …)` / `uuidParam`, respond with `sendData` → always `{ success, data }` / `{ success: false, error }` (see `backend/src/utils/http.ts`).
- CYOA (choice-based stories): `stories.is_cyoa` + `chapter_choices`; UI in `ChapterChoices.tsx`, `StoryMap.tsx`, `ContentEditor.tsx` (ported from the `AI-main` branch).
- Moderation is post-moderation: creators publish directly; reports drive review. DB triggers (`migration_004`) keep admin takedowns (`review_status = 'rejected'`) locked for creators and block writes from timed-out users (`user_moderation_actions`, type `timeout`; `warning` reserved for the upcoming warning/message system).
- CYOA choices must stay within one story (DB trigger) and are only shown to readers when both chapters are published. Uploads: images only (`frontend/src/lib/uploads.ts` mirrors the bucket limits: covers 5 MB under `<user id>/`, manga pages 10 MB under `<story id>/`, owner/admin only).
- PDF export uses puppeteer 25 with `headless: "shell"`; install the browser once per machine/server with `cd backend && npx puppeteer browsers install chrome-headless-shell` (install scripts are disabled, so npm won't download it).
- Dependencies: when updating, use `npm audit fix --before=<date 7+ days ago> --ignore-scripts` so no freshly published versions are pulled in.
- Reports are created only via `POST /api/reports` (validation, per-account rate limit, duplicate/self-report checks); `migration_005` removes the direct client INSERT policy.
- Client IPs: always use `req.ip`; set `TRUST_PROXY` (number of proxy hops) in `backend/.env` when deployed behind a proxy. Never read `X-Forwarded-For` / `CF-Connecting-IP` directly.
- 2FA = Supabase Auth TOTP MFA (`TwoFactorSettings` on the profile page, global `MfaChallenge` prompt, `useAuth().mfaRequired`). A user with a verified factor at `aal1` is refused by `requireAuth` (`401 code: "mfa_required"`) and by restrictive RLS write policies (`migration_007`). The old custom `/api/auth/2fa/*` + `user_2fa_secrets` is gone/unused.
- Sign-in/sign-up pass the hCaptcha token to Supabase (`options.captchaToken`); enforcement requires Bot Protection to be enabled in the Supabase dashboard.
- Moderation actions: use `issueModerationAction` / `assertModeratable` in `backend/src/utils/moderation.ts` (records the action + sends a `notifications` row linking to `/notices`). Users see theirs via `GET /api/moderation/me` (site-wide `ModerationNotices` banner + `/notices` page) and acknowledge them; admins warn/timeout/withdraw via `ModerationActionDialog` / `ModerationHistoryDialog`.
- Live tests: create throwaway users via `supabaseAdmin.auth.admin.createUser` and always delete them afterwards. Never write credentials to files. Bot Protection (captcha) is enabled, so password sign-in fails in scripts — get sessions with `supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email })` + `auth.verifyOtp({ token_hash, type: "magiclink" })`, and use a throwaway admin instead of a real account.
