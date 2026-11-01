-- ============================================================
--  Midnight Platform — Migration 006: CYOA choice rules + upload limits
--  Run AFTER migration_005_reports.sql. Safe to re-run (idempotent).
-- ============================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. CYOA choices (modelled on CHYOA's Link Chapter rules)
-- ════════════════════════════════════════════════════════════════════════════
--   * A choice can only lead to a chapter in the SAME story (applies to
--     everyone, admins included — a cross-story link is always a bug).
--   * Readers only see a choice when both its source and its destination
--     chapter are published, so a choice never leads to a hidden chapter.

CREATE OR REPLACE FUNCTION public.enforce_chapter_choice_same_story()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_story uuid;
  target_story uuid;
BEGIN
  SELECT story_id INTO source_story FROM public.chapters WHERE id = NEW.source_chapter_id;
  SELECT story_id INTO target_story FROM public.chapters WHERE id = NEW.target_chapter_id;
  IF source_story IS DISTINCT FROM target_story THEN
    RAISE EXCEPTION 'A choice can only lead to a chapter in the same story.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_chapter_choice_same_story ON public.chapter_choices;
CREATE TRIGGER enforce_chapter_choice_same_story
  BEFORE INSERT OR UPDATE ON public.chapter_choices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_chapter_choice_same_story();

DROP POLICY IF EXISTS "chapter_choices_select_approved" ON public.chapter_choices;
CREATE POLICY "chapter_choices_select_approved"
  ON public.chapter_choices FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.chapters s WHERE s.id = chapter_choices.source_chapter_id AND s.review_status = 'approved')
    AND
    EXISTS (SELECT 1 FROM public.chapters t WHERE t.id = chapter_choices.target_chapter_id AND t.review_status = 'approved')
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Upload limits (Supabase Storage)
-- ════════════════════════════════════════════════════════════════════════════
-- Before: any signed-in user could upload any file of any size anywhere in
-- both public buckets, and covers were stored at the bucket root so the
-- "owner may update/delete" policies never matched.
-- Now:
--   * covers:       images only, max 5 MB, stored under <user id>/...
--   * manga-images: images only, max 10 MB, stored under <story id>/... and
--                   only the story's creator (or an admin) may upload there
--   * timed-out users can't upload
-- Files already uploaded stay publicly readable.

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'covers';

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'manga-images';

-- True if the first folder of an object path is a story the caller owns
CREATE OR REPLACE FUNCTION public.owns_story_folder(_name text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stories
    WHERE id::text = (storage.foldername(_name))[1]
      AND created_by = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "covers_insert_auth" ON storage.objects;
CREATE POLICY "covers_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'covers'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.active_timeout_until(auth.uid()) IS NULL
  );

DROP POLICY IF EXISTS "manga_images_insert_auth" ON storage.objects;
CREATE POLICY "manga_images_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'manga-images'
    AND auth.role() = 'authenticated'
    AND (public.owns_story_folder(name) OR public.is_admin(auth.uid()))
    AND public.active_timeout_until(auth.uid()) IS NULL
  );

DROP POLICY IF EXISTS "manga_images_update_own" ON storage.objects;
CREATE POLICY "manga_images_update_own"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'manga-images' AND (public.owns_story_folder(name) OR public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "manga_images_delete_own" ON storage.objects;
CREATE POLICY "manga_images_delete_own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'manga-images' AND (public.owns_story_folder(name) OR public.is_admin(auth.uid())));

-- Admins can clean up any cover (e.g. after a takedown)
DROP POLICY IF EXISTS "covers_delete_admin" ON storage.objects;
CREATE POLICY "covers_delete_admin"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'covers' AND public.is_admin(auth.uid()));
