-- ============================================================
--  Midnight Platform — Migration 002: fixes
--  Run AFTER migration.sql. Safe to re-run (idempotent).
--  Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ── RPC: increment_helpful_count (used by POST /api/reviews/:id/helpful) ─────
CREATE OR REPLACE FUNCTION public.increment_helpful_count(review_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.reviews
  SET helpful_count = COALESCE(helpful_count, 0) + 1
  WHERE id = review_id;
$$;

-- Counter RPCs are backend-only (service role); block direct calls from clients
REVOKE EXECUTE ON FUNCTION public.increment_helpful_count(uuid)    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_story_view_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_helpful_count(uuid)    TO service_role;
GRANT  EXECUTE ON FUNCTION public.increment_story_view_count(uuid) TO service_role;

-- ── Comments: let the block-aware SELECT policy actually take effect ─────────
-- Permissive policies are OR'd, so USING (true) was overriding the block filter.
DROP POLICY IF EXISTS "comments_select_public" ON public.comments;

-- ── Auto-approve comments and reviews ───────────────────────────────────────
ALTER TABLE public.comments ALTER COLUMN is_approved SET DEFAULT true;
ALTER TABLE public.reviews  ALTER COLUMN is_approved SET DEFAULT true;

UPDATE public.comments SET is_approved = true WHERE is_approved IS DISTINCT FROM true;
UPDATE public.reviews  SET is_approved = true WHERE is_approved IS DISTINCT FROM true;

-- ── Admin moderation policies ───────────────────────────────────────────────
DROP POLICY IF EXISTS "reviews_update_admin" ON public.reviews;
CREATE POLICY "reviews_update_admin"
  ON public.reviews FOR UPDATE
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "reviews_delete_admin" ON public.reviews;
CREATE POLICY "reviews_delete_admin"
  ON public.reviews FOR DELETE
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "comments_update_admin" ON public.comments;
CREATE POLICY "comments_update_admin"
  ON public.comments FOR UPDATE
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "ratings_delete_admin" ON public.ratings;
CREATE POLICY "ratings_delete_admin"
  ON public.ratings FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ── Favorites visible on public profiles when show_favorites is on ──────────
DROP POLICY IF EXISTS "user_favorites_select_public" ON public.user_favorites;
CREATE POLICY "user_favorites_select_public"
  ON public.user_favorites FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_favorites.user_id AND profiles.show_favorites IS TRUE
  ));

-- ── Keep stories.average_rating in sync with ratings ────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_story_average_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid := COALESCE(NEW.story_id, OLD.story_id);
BEGIN
  UPDATE public.stories
  SET average_rating = COALESCE(
    (SELECT ROUND(AVG(rating)::numeric, 2) FROM public.ratings WHERE story_id = target),
    0
  )
  WHERE id = target;

  IF TG_OP = 'UPDATE' AND OLD.story_id IS DISTINCT FROM NEW.story_id THEN
    UPDATE public.stories
    SET average_rating = COALESCE(
      (SELECT ROUND(AVG(rating)::numeric, 2) FROM public.ratings WHERE story_id = OLD.story_id),
      0
    )
    WHERE id = OLD.story_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ratings_refresh_story_average ON public.ratings;
CREATE TRIGGER ratings_refresh_story_average
  AFTER INSERT OR UPDATE OR DELETE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.refresh_story_average_rating();

-- Backfill
UPDATE public.stories s
SET average_rating = COALESCE(r.avg_rating, 0)
FROM (
  SELECT st.id, ROUND(AVG(ra.rating)::numeric, 2) AS avg_rating
  FROM public.stories st
  LEFT JOIN public.ratings ra ON ra.story_id = st.id
  GROUP BY st.id
) r
WHERE s.id = r.id;

-- ── Don't bump stories.updated_at for counter-only changes ──────────────────
-- Otherwise every view / rating moves the story to the top of "Latest update".
CREATE OR REPLACE FUNCTION public.set_stories_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - 'view_count' - 'average_rating' - 'updated_at')
     = (to_jsonb(OLD) - 'view_count' - 'average_rating' - 'updated_at') THEN
    NEW.updated_at = OLD.updated_at;
  ELSE
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.stories;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.set_stories_updated_at();

-- ── Creator role ────────────────────────────────────────────────────────────
-- Granted/revoked by the backend (POST/DELETE /api/auth/creator) using the
-- service role. No client-side policy is added on purpose: users must not be
-- able to insert arbitrary roles (e.g. 'admin') into user_roles themselves.
