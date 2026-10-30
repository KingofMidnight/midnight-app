-- ============================================================
--  Midnight Platform — Migration 003: security hardening
--  Run AFTER migration_002_fixes.sql. Safe to re-run (idempotent).
-- ============================================================

-- ── 2FA secrets are backend-only ────────────────────────────────────────────
-- With these policies a stolen access token (or XSS) could read the TOTP secret
-- straight from the REST API, or write is_enabled/backup_codes directly.
-- RLS stays enabled with no client policies, so only the service role can access.
DROP POLICY IF EXISTS "Users can see own 2fa secrets" ON public.user_2fa_secrets;
DROP POLICY IF EXISTS "Users can insert own 2fa"      ON public.user_2fa_secrets;
DROP POLICY IF EXISTS "Users can update own 2fa"      ON public.user_2fa_secrets;

-- ── Sessions are written by the backend only ────────────────────────────────
-- Users may still list their own sessions; they can no longer forge or revive them.
DROP POLICY IF EXISTS "Users can create sessions"       ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update their sessions" ON public.user_sessions;

-- ── Fix: user_sessions has no updated_at column ─────────────────────────────
-- migration.sql attached set_updated_at to it, so EVERY update failed with
-- 'record "new" has no field "updated_at"' (terminate, terminate-all, activity).
DROP TRIGGER IF EXISTS set_updated_at ON public.user_sessions;
