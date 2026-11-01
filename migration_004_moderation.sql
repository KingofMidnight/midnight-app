-- ============================================================
--  Midnight Platform — Migration 004: moderation (post-moderation + timeouts)
--  Run AFTER migration_003_security.sql. Safe to re-run (idempotent).
-- ============================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Post-moderation for stories, chapters and episodes
-- ════════════════════════════════════════════════════════════════════════════
-- Creators publish directly (content goes live immediately) and content is
-- reviewed when users flag it. Enforced in the database so no client can bypass:
--
--   * Editing content never changes its review status.
--   * Creators may set draft / pending / approved / archived on their content.
--   * Creators can NOT set "rejected", and content an admin took down
--     ("rejected") stays down no matter what the creator does — only an admin
--     or moderator can restore it.
--   * Admins, moderators and the backend (service role) are unrestricted.

CREATE OR REPLACE FUNCTION public.enforce_review_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Backend (service role) and SQL editor have no auth.uid(); moderators/admins are trusted
  IF auth.uid() IS NULL OR public.is_moderator(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.review_status IS NULL OR NEW.review_status NOT IN ('draft', 'pending', 'approved') THEN
      NEW.review_status := 'approved';
    END IF;
    RETURN NEW;
  END IF;

  -- A takedown can only be lifted by an admin/moderator
  IF OLD.review_status = 'rejected' THEN
    NEW.review_status := 'rejected';
    RETURN NEW;
  END IF;

  IF NEW.review_status IS DISTINCT FROM OLD.review_status
     AND NEW.review_status NOT IN ('draft', 'pending', 'approved', 'archived') THEN
    NEW.review_status := OLD.review_status;
  END IF;

  RETURN NEW;
END;
$$;

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['stories', 'chapters', 'episodes'] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS enforce_review_status ON public.%I;
      CREATE TRIGGER enforce_review_status
        BEFORE INSERT OR UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.enforce_review_status();
    ', t, t);
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Moderation actions: timeouts now, warnings + user messages later
-- ════════════════════════════════════════════════════════════════════════════
-- One table records every action a moderator takes against a user. Today only
-- "timeout" is enforced. "warning" is reserved for the upcoming warning system,
-- and `message` / `acknowledged_at` are there so a future in-app message system
-- can show the user what happened and record that they saw it.

DO $$ BEGIN CREATE TYPE moderation_action_type AS ENUM ('warning', 'timeout');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_moderation_actions (
  id              uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid                   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type     moderation_action_type NOT NULL,
  reason          text                   NOT NULL,
  message         text,
  report_id       uuid                   REFERENCES public.reports(id) ON DELETE SET NULL,
  issued_by       uuid                   REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  revoked_by      uuid                   REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  created_at      timestamptz            NOT NULL DEFAULT now(),
  CONSTRAINT timeout_requires_expiry CHECK (action_type <> 'timeout' OR expires_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_user   ON public.user_moderation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_report ON public.user_moderation_actions(report_id);

ALTER TABLE public.user_moderation_actions ENABLE ROW LEVEL SECURITY;

-- Users can see actions taken against them (for the future message/warning UI);
-- only the backend (service role) writes. Admins read everything.
DROP POLICY IF EXISTS "moderation_actions_select_own" ON public.user_moderation_actions;
CREATE POLICY "moderation_actions_select_own"
  ON public.user_moderation_actions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "moderation_actions_select_admin" ON public.user_moderation_actions;
CREATE POLICY "moderation_actions_select_admin"
  ON public.user_moderation_actions FOR SELECT
  USING (public.is_moderator(auth.uid()));

CREATE OR REPLACE FUNCTION public.active_timeout_until(_user_id uuid)
RETURNS timestamptz LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT max(expires_at) FROM public.user_moderation_actions
  WHERE user_id = _user_id
    AND action_type = 'timeout'
    AND revoked_at IS NULL
    AND expires_at > now();
$$;

-- Blocks creating/editing content while timed out. Reading is unaffected.
-- TG_ARGV[0] = column holding the acting user's id; falls back to auth.uid()
-- (needed for chapters/episodes, which have no user column of their own).
CREATE OR REPLACE FUNCTION public.block_timed_out_users()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid;
  until timestamptz;
BEGIN
  -- Moderators/admins acting on anyone's content are never blocked
  IF auth.uid() IS NOT NULL AND public.is_moderator(auth.uid()) THEN
    RETURN NEW;
  END IF;

  actor := COALESCE(NULLIF(to_jsonb(NEW) ->> TG_ARGV[0], '')::uuid, auth.uid());
  IF actor IS NULL OR public.is_moderator(actor) THEN
    RETURN NEW;
  END IF;

  -- Updates only count when the user is editing their own row. This keeps
  -- side effects working (e.g. someone rating a timed-out creator's story
  -- updates that story's average_rating; the backend bumps view counts).
  IF TG_OP = 'UPDATE' AND actor IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;

  until := public.active_timeout_until(actor);
  IF until IS NOT NULL THEN
    RAISE EXCEPTION 'You are timed out until % and cannot post or edit content.',
      to_char(until AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI "UTC"')
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('comments', 'user_id'), ('reviews', 'user_id'), ('reports', 'reporter_id'),
    ('stories', 'created_by'), ('chapters', '-'), ('episodes', '-'), ('chapter_choices', '-'),
    ('ratings', 'user_id')
  ) AS v(tbl, col) LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS block_timed_out_users ON public.%I;
      CREATE TRIGGER block_timed_out_users
        BEFORE INSERT OR UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.block_timed_out_users(%L);
    ', r.tbl, r.tbl, r.col);
  END LOOP;
END $$;
