-- ============================================================
--  Midnight Platform — Migration 005: reports go through the backend
--  Run AFTER migration_004_moderation.sql. Safe to re-run (idempotent).
-- ============================================================
-- Reports are now created only via POST /api/reports, which validates input,
-- rate-limits per account, rejects duplicates and self-reports, and requires
-- the DMCA fields for DMCA reports. Removing the direct client INSERT policy
-- stops users from bypassing those checks through the Supabase REST API.
-- Reporters can still read their own reports; admins keep full access.

DROP POLICY IF EXISTS "reports_insert_auth" ON public.reports;
