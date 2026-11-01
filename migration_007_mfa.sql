-- ============================================================
--  Midnight Platform — Migration 007: enforce two-factor authentication
--  Run AFTER migration_006_cyoa_uploads.sql. Safe to re-run (idempotent).
-- ============================================================
-- Uses Supabase Auth's built-in TOTP MFA. A user who has turned on 2FA signs in
-- at assurance level "aal1" (password / link only) and reaches "aal2" after
-- entering an authenticator code. Until then their session must not be able to
-- change anything, even if the website's code is bypassed:
--   * every write (INSERT / UPDATE / DELETE) on every public table and on
--     storage uploads requires aal2 for users who have a verified 2FA factor;
--   * reading is unaffected (the website shows the code prompt instead);
--   * users without 2FA are unaffected; the backend (service role) bypasses RLS
--     and enforces the same rule itself in requireAuth.
-- These are RESTRICTIVE policies, so they are AND-ed with the existing ones.

CREATE OR REPLACE FUNCTION public.mfa_satisfied()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      OR NOT EXISTS (
        SELECT 1 FROM auth.mfa_factors
        WHERE user_id = auth.uid() AND status = 'verified'
      );
$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS mfa_required_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS mfa_required_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS mfa_required_delete ON public.%I', t);
    EXECUTE format('CREATE POLICY mfa_required_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.mfa_satisfied())', t);
    EXECUTE format('CREATE POLICY mfa_required_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.mfa_satisfied()) WITH CHECK (public.mfa_satisfied())', t);
    EXECUTE format('CREATE POLICY mfa_required_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.mfa_satisfied())', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS mfa_required_insert ON storage.objects;
DROP POLICY IF EXISTS mfa_required_update ON storage.objects;
DROP POLICY IF EXISTS mfa_required_delete ON storage.objects;
CREATE POLICY mfa_required_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.mfa_satisfied());
CREATE POLICY mfa_required_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.mfa_satisfied()) WITH CHECK (public.mfa_satisfied());
CREATE POLICY mfa_required_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING (public.mfa_satisfied());

-- The old custom 2FA (public.user_2fa_secrets + /api/auth/2fa/*) is replaced by
-- Supabase MFA and no longer used. The table is left in place; drop it when
-- you're sure nothing needs it:
--   DROP TABLE IF EXISTS public.user_2fa_secrets;
