# Midnight — agent notes

## Layout
- `backend/` Express + TypeScript API (port 3001). Entry: `backend/index.ts`.
- `frontend/` React + Vite (port 8080). All backend calls go through `frontend/src/lib/api.ts` (`VITE_API_URL`).
- Supabase is the DB/auth. Schema = `migration.sql`, then `migration_002_fixes.sql`, then `migration_003_security.sql` (run in order in the Supabase SQL editor).

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
- Live tests: create throwaway users via `supabaseAdmin.auth.admin.createUser` and always delete them afterwards. Never write credentials to files.
