-- ============================================================
--  Midnight Platform — Full Schema Migration v2
--  Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user', 'creator');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE content_origin AS ENUM ('original', 'fanfiction');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE list_type AS ENUM ('reading', 'completed', 'plan_to_read');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE relationship_type AS ENUM ('adapts', 'sequel', 'prequel', 'spinoff', 'alternative');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE report_type AS ENUM ('content', 'user', 'dmca');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE story_status AS ENUM ('ongoing', 'completed', 'hiatus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE story_type AS ENUM ('novel', 'manga', 'comic', 'anime', 'cartoon', 'audiobook');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── profiles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username             text        UNIQUE,
  display_name         text,
  bio                  text,
  avatar_url           text,
  show_lists           boolean     NOT NULL DEFAULT true,
  show_created_content boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Auto-create profile on signup ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username  text;
  final_username text;
  counter        int := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  final_username := base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter        := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'username',
      final_username
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── user_roles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       app_role    NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ── user_bans ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_bans (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by  uuid        NOT NULL REFERENCES auth.users(id),
  reason     text        NOT NULL,
  notes      text,
  is_active  boolean     NOT NULL DEFAULT true,
  expires_at timestamptz,
  banned_at  timestamptz NOT NULL DEFAULT now()
);

-- ── stories ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stories (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text           NOT NULL,
  description     text,
  type            story_type     NOT NULL,
  status          story_status   NOT NULL DEFAULT 'ongoing',
  review_status   text           NOT NULL DEFAULT 'pending',
  content_origin  content_origin NOT NULL DEFAULT 'original',
  author_name     text,
  genres          text[]         NOT NULL DEFAULT '{}',
  tags            text[]         NOT NULL DEFAULT '{}',
  cover_image_url text,
  created_by      uuid           REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now()
);

-- ── chapters ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chapters (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id       uuid        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  chapter_number integer     NOT NULL,
  title          text        NOT NULL,
  content        text,
  image_urls     text[]      NOT NULL DEFAULT '{}',
  review_status  text        NOT NULL DEFAULT 'pending',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, chapter_number)
);

-- ── episodes ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.episodes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id         uuid        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  episode_number   integer     NOT NULL,
  title            text        NOT NULL,
  embed_url        text,
  thumbnail_url    text,
  duration_minutes integer,
  review_status    text        NOT NULL DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, episode_number)
);

-- ── story_relationships ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.story_relationships (
  id              uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  source_story_id uuid              NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  target_story_id uuid              NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  relationship    relationship_type NOT NULL,
  created_at      timestamptz       NOT NULL DEFAULT now(),
  UNIQUE (source_story_id, target_story_id, relationship)
);

-- ── comments ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   uuid        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL,
  chapter_id uuid        REFERENCES public.chapters(id) ON DELETE CASCADE,
  episode_id uuid        REFERENCES public.episodes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Indexes for chapter_id/episode_id are created later, after the ALTER TABLE
-- upgrade block that adds these columns to pre-existing databases. Creating
-- them here would fail on a database where public.comments already existed
-- without these columns (CREATE TABLE IF NOT EXISTS is a no-op in that case).

-- ── ratings ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ratings (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   uuid        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating     integer     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_id)
);

-- ── user_lists ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_lists (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  story_id   uuid        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  list       list_type   NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_id)
);

-- ── user_progress ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_progress (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  story_id        uuid        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  last_chapter_id uuid        REFERENCES public.chapters(id) ON DELETE SET NULL,
  last_episode_id uuid        REFERENCES public.episodes(id) ON DELETE SET NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_id)
);

-- ── hidden_stories ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hidden_stories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  story_id   uuid        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_id)
);

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       text        NOT NULL,
  title      text        NOT NULL,
  message    text,
  link       text,
  read       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── reports ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id                     uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id            uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id       uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  story_id               uuid          REFERENCES public.stories(id) ON DELETE SET NULL,
  chapter_id             uuid          REFERENCES public.chapters(id) ON DELETE SET NULL,
  episode_id             uuid          REFERENCES public.episodes(id) ON DELETE SET NULL,
  comment_id             uuid          REFERENCES public.comments(id) ON DELETE SET NULL,
  report_type            report_type   NOT NULL,
  reason                 text          NOT NULL,
  details                text,
  status                 report_status NOT NULL DEFAULT 'pending',
  admin_notes            text,
  resolved_by            uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at            timestamptz,
  dmca_claimant_name     text,
  dmca_claimant_email    text,
  dmca_original_work_url text,
  created_at             timestamptz   NOT NULL DEFAULT now(),
  updated_at             timestamptz   NOT NULL DEFAULT now()
);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','stories','chapters','episodes',
    'comments','ratings','reports'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    ', t, t);
  END LOOP;
END $$;

-- ── Helper functions ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_moderator(_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT public.has_role(_user_id, 'moderator') OR public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_creator(_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT public.has_role(_user_id, 'creator') OR public.has_role(_user_id, 'admin');
$$;

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lists          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_stories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports             ENABLE ROW LEVEL SECURITY;

-- ── profiles policies ─────────────────────────────────────────────────────────
-- INSERT aberto para o trigger (SECURITY DEFINER) conseguir criar o profile
CREATE POLICY "profiles_insert_trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ── user_roles policies ───────────────────────────────────────────────────────
CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_roles_select_admin"
  ON public.user_roles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "user_roles_all_admin"
  ON public.user_roles FOR ALL
  USING (public.is_admin(auth.uid()));

-- ── user_bans policies ────────────────────────────────────────────────────────
CREATE POLICY "user_bans_select_own"
  ON public.user_bans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_bans_all_admin"
  ON public.user_bans FOR ALL
  USING (public.is_admin(auth.uid()));

-- ── stories policies ──────────────────────────────────────────────────────────
CREATE POLICY "stories_select_approved"
  ON public.stories FOR SELECT
  USING (review_status = 'approved');

CREATE POLICY "stories_select_own"
  ON public.stories FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "stories_select_admin"
  ON public.stories FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "stories_insert_creator"
  ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = created_by AND public.is_creator(auth.uid()));

CREATE POLICY "stories_update_own"
  ON public.stories FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "stories_update_admin"
  ON public.stories FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "stories_delete_own"
  ON public.stories FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "stories_delete_admin"
  ON public.stories FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ── chapters policies ─────────────────────────────────────────────────────────
CREATE POLICY "chapters_select_approved"
  ON public.chapters FOR SELECT
  USING (review_status = 'approved');

CREATE POLICY "chapters_select_own"
  ON public.chapters FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stories
    WHERE stories.id = chapters.story_id AND stories.created_by = auth.uid()
  ));

CREATE POLICY "chapters_select_admin"
  ON public.chapters FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "chapters_all_own"
  ON public.chapters FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.stories
    WHERE stories.id = chapters.story_id AND stories.created_by = auth.uid()
  ));

CREATE POLICY "chapters_all_admin"
  ON public.chapters FOR ALL
  USING (public.is_admin(auth.uid()));

-- ── episodes policies ─────────────────────────────────────────────────────────
CREATE POLICY "episodes_select_approved"
  ON public.episodes FOR SELECT
  USING (review_status = 'approved');

CREATE POLICY "episodes_select_own"
  ON public.episodes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stories
    WHERE stories.id = episodes.story_id AND stories.created_by = auth.uid()
  ));

CREATE POLICY "episodes_select_admin"
  ON public.episodes FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "episodes_all_own"
  ON public.episodes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.stories
    WHERE stories.id = episodes.story_id AND stories.created_by = auth.uid()
  ));

CREATE POLICY "episodes_all_admin"
  ON public.episodes FOR ALL
  USING (public.is_admin(auth.uid()));

-- ── story_relationships policies ──────────────────────────────────────────────
CREATE POLICY "story_relationships_select_public"
  ON public.story_relationships FOR SELECT
  USING (true);

CREATE POLICY "story_relationships_all_admin"
  ON public.story_relationships FOR ALL
  USING (public.is_admin(auth.uid()));

-- ── comments policies ─────────────────────────────────────────────────────────
CREATE POLICY "comments_select_public"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "comments_insert_auth"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_update_own"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "comments_delete_own"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "comments_delete_admin"
  ON public.comments FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ── ratings policies ──────────────────────────────────────────────────────────
CREATE POLICY "ratings_select_public"
  ON public.ratings FOR SELECT
  USING (true);

CREATE POLICY "ratings_insert_auth"
  ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ratings_update_own"
  ON public.ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "ratings_delete_own"
  ON public.ratings FOR DELETE
  USING (auth.uid() = user_id);

-- ── user_lists policies ───────────────────────────────────────────────────────
CREATE POLICY "user_lists_all_own"
  ON public.user_lists FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "user_lists_select_public"
  ON public.user_lists FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_id AND profiles.show_lists = true
  ));

-- ── user_progress policies ────────────────────────────────────────────────────
CREATE POLICY "user_progress_all_own"
  ON public.user_progress FOR ALL
  USING (auth.uid() = user_id);

-- ── hidden_stories policies ───────────────────────────────────────────────────
CREATE POLICY "hidden_stories_all_own"
  ON public.hidden_stories FOR ALL
  USING (auth.uid() = user_id);

-- ── notifications policies ────────────────────────────────────────────────────
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_admin"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- ── reports policies ──────────────────────────────────────────────────────────
CREATE POLICY "reports_insert_auth"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "reports_all_admin"
  ON public.reports FOR ALL
  USING (public.is_admin(auth.uid()));

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stories_type          ON public.stories(type);
CREATE INDEX IF NOT EXISTS idx_stories_review_status ON public.stories(review_status);
CREATE INDEX IF NOT EXISTS idx_stories_created_by    ON public.stories(created_by);
CREATE INDEX IF NOT EXISTS idx_chapters_story_id     ON public.chapters(story_id);
CREATE INDEX IF NOT EXISTS idx_episodes_story_id     ON public.episodes(story_id);
CREATE INDEX IF NOT EXISTS idx_comments_story_id     ON public.comments(story_id);
CREATE INDEX IF NOT EXISTS idx_ratings_story_id      ON public.ratings(story_id);
CREATE INDEX IF NOT EXISTS idx_user_lists_user_id    ON public.user_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status        ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_user_bans_user_id     ON public.user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_is_active   ON public.user_bans(is_active);

-- ── Storage buckets ───────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('covers',       'covers',       true),
  ('manga-images', 'manga-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "covers_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

CREATE POLICY "manga_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'manga-images');

CREATE POLICY "covers_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'covers' AND auth.role() = 'authenticated');

CREATE POLICY "manga_images_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'manga-images' AND auth.role() = 'authenticated');

CREATE POLICY "covers_update_own"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "covers_delete_own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "manga_images_update_own"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'manga-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "manga_images_delete_own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'manga-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── Backfill existing users without profiles ──────────────────────────────────
INSERT INTO public.profiles (id, username, display_name)
SELECT
  id,
  split_part(email, '@', 1),
  split_part(email, '@', 1)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Migration: add comment_id to reports table
──────────────────────────────────

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS comment_id uuid REFERENCES public.comments(id) ON DELETE SET NULL;

-- Optional: index for faster lookups
CREATE INDEX IF NOT EXISTS reports_comment_id_idx ON public.reports(comment_id);

-- Favorites
──────────────────────────────────

CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, story_id)
);


-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_story_id ON user_favorites(story_id);

-- Enable RLS
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Policies for user_favorites
CREATE POLICY "Users can view their own favorites" 
  ON user_favorites FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" 
  ON user_favorites FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
  ON user_favorites FOR DELETE 
  USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS creator_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(follower_user_id, creator_user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_creator_followers_follower_id ON creator_followers(follower_user_id);
CREATE INDEX IF NOT EXISTS idx_creator_followers_creator_id ON creator_followers(creator_user_id);

-- Enable RLS
ALTER TABLE creator_followers ENABLE ROW LEVEL SECURITY;

-- Policies for creator_followers
CREATE POLICY "Anyone can view followers for a creator" 
  ON creator_followers FOR SELECT 
  USING (true);

CREATE POLICY "Users can follow creators" 
  ON creator_followers FOR INSERT 
  WITH CHECK (auth.uid() = follower_user_id);

CREATE POLICY "Users can unfollow creators" 
  ON creator_followers FOR DELETE 
  USING (auth.uid() = follower_user_id);

-- ── View count support ───────────────────────────────────────────────────────

-- Add view_count column to stories
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_stories_view_count ON public.stories(view_count DESC);

-- Create story_views table for IP deduplication (24h window)
CREATE TABLE IF NOT EXISTS public.story_views (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   uuid        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  ip_address text        NOT NULL,
  viewed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_views_story_id  ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_ip        ON public.story_views(ip_address);
CREATE INDEX IF NOT EXISTS idx_story_views_viewed_at ON public.story_views(viewed_at);

-- Enable RLS (backend uses service role, so policies are permissive for inserts)
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_views_insert_all"
  ON public.story_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "story_views_select_admin"
  ON public.story_views FOR SELECT
  USING (public.is_admin(auth.uid()));

-- RPC function to safely increment view_count
CREATE OR REPLACE FUNCTION public.increment_story_view_count(story_id_input uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.stories
  SET view_count = view_count + 1
  WHERE id = story_id_input;
$$;

-- Optional: clean up old view records older than 30 days
-- (run periodically via pg_cron or Supabase scheduled functions)
-- DELETE FROM public.story_views WHERE viewed_at < now() - interval '30 days';

-- Adicionar coluna show_favorites à tabela profiles
ALTER TABLE profiles 
ADD COLUMN show_favorites BOOLEAN DEFAULT true;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_show_favorites ON profiles(show_favorites);

-- ── Content Rating Enum ───────────────────────────────────────
DO $$
BEGIN
  CREATE TYPE content_rating AS ENUM (
    'safe',
    'suggestive',
    'mature',
    'explicit'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Alter stories table ────────────────────────────────────────
ALTER TABLE IF EXISTS public.stories
ADD COLUMN IF NOT EXISTS content_rating content_rating NOT NULL DEFAULT 'safe',
ADD COLUMN IF NOT EXISTS average_rating numeric(3, 2) DEFAULT 0;

-- ── Update comments table for threading ────────────────────────
ALTER TABLE IF EXISTS public.comments
ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- ── User blocks table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- ── Reviews table (separate from ratings) ──────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   uuid        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  content    text        NOT NULL,
  rating     integer     CHECK (rating BETWEEN 1 AND 5),
  helpful_count integer DEFAULT 0,
  is_approved boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_id)
);

-- ── 2FA Secrets table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_2fa_secrets (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  secret     text        NOT NULL,
  is_enabled boolean     DEFAULT false,
  backup_codes text[]    NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Session tracking ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_activity timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  is_active  boolean     DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Add updated_at trigger to new tables ───────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['reviews','user_2fa_secrets','user_sessions'] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    ', t, t);
  END LOOP;
END $$;

-- ── RLS for user_blocks ────────────────────────────────────────
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- (Opcional: deixar explícito TO authenticated/anon. Mantive seu comportamento atual.)
DROP POLICY IF EXISTS "Users can see their own blocks" ON public.user_blocks;
CREATE POLICY "Users can see their own blocks"
ON public.user_blocks FOR SELECT
USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

DROP POLICY IF EXISTS "Users can create blocks" ON public.user_blocks;
CREATE POLICY "Users can create blocks"
ON public.user_blocks FOR INSERT
WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.user_blocks;
CREATE POLICY "Users can delete their own blocks"
ON public.user_blocks FOR DELETE
USING (blocker_id = auth.uid());

-- ── RLS for reviews ────────────────────────────────────────────
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read approved reviews" ON public.reviews;
CREATE POLICY "Anyone can read approved reviews"
ON public.reviews FOR SELECT
USING (is_approved = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews"
ON public.reviews FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews"
ON public.reviews FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews"
ON public.reviews FOR DELETE
USING (user_id = auth.uid());

-- ── RLS for 2FA secrets ────────────────────────────────────────
ALTER TABLE public.user_2fa_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own 2fa secrets" ON public.user_2fa_secrets;
CREATE POLICY "Users can see own 2fa secrets"
ON public.user_2fa_secrets FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own 2fa" ON public.user_2fa_secrets;
CREATE POLICY "Users can insert own 2fa"
ON public.user_2fa_secrets FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own 2fa" ON public.user_2fa_secrets;
CREATE POLICY "Users can update own 2fa"
ON public.user_2fa_secrets FOR UPDATE
USING (user_id = auth.uid());

-- ── RLS for sessions ────────────────────────────────────────────
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see their own sessions" ON public.user_sessions;
CREATE POLICY "Users see their own sessions"
ON public.user_sessions FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create sessions" ON public.user_sessions;
CREATE POLICY "Users can create sessions"
ON public.user_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their sessions" ON public.user_sessions;
CREATE POLICY "Users can update their sessions"
ON public.user_sessions FOR UPDATE
USING (user_id = auth.uid());

-- ── Enhance existing RLS ────────────────────────────────────────
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- ✅ Corrigido: trocado CREATE POLICY IF NOT EXISTS por DROP + CREATE

DROP POLICY IF EXISTS "Comments readable if not blocked by author" ON public.comments;
CREATE POLICY "Comments readable if not blocked by author"
ON public.comments FOR SELECT
USING (
  NOT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = comments.user_id AND blocked_id = auth.uid())
       OR (blocker_id = auth.uid() AND blocked_id = comments.user_id)
  )
);

DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
CREATE POLICY "Users can insert their own comments"
ON public.comments FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments"
ON public.comments FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments"
ON public.comments FOR DELETE
USING (user_id = auth.uid());

-- ── View for average story ratings ────────────────────────────
CREATE OR REPLACE VIEW public.story_ratings_summary AS
SELECT
  story_id,
  COUNT(*) as rating_count,
  ROUND(AVG(rating)::numeric, 2) as average_rating,
  MAX(rating) as max_rating,
  MIN(rating) as min_rating
FROM public.ratings
GROUP BY story_id;

-- ── Cleanup old comment policies if needed ─────────────────────
DROP POLICY IF EXISTS "Comments readable to all" ON public.comments;
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;

-- ── Per-content comments: allow a comment to target a specific chapter or episode ──
ALTER TABLE IF EXISTS public.comments
ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS episode_id uuid REFERENCES public.episodes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comments_chapter_id ON public.comments(chapter_id) WHERE chapter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_episode_id ON public.comments(episode_id) WHERE episode_id IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.comments
    ADD CONSTRAINT comments_single_content_target
    CHECK (NOT (chapter_id IS NOT NULL AND episode_id IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Let a creator manage relationships originating from their own stories ──
DROP POLICY IF EXISTS "story_relationships_manage_own" ON public.story_relationships;
CREATE POLICY "story_relationships_manage_own"
  ON public.story_relationships FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.stories WHERE id = source_story_id AND created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stories WHERE id = source_story_id AND created_by = auth.uid()
  ));

-- ── CYOA branching ────────────────────────────────────────────────────────────
-- Marks a story as using choice-based (CYOA) branching between chapters.
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS is_cyoa boolean NOT NULL DEFAULT false;

-- Each row is one reader-facing choice at the end of a chapter, pointing to
-- whichever chapter it leads to. Multiple choices can point back to the same
-- target chapter (branches re-converging), and a chapter can have zero
-- choices (a branch ending).
CREATE TABLE IF NOT EXISTS public.chapter_choices (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_chapter_id uuid        NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  target_chapter_id uuid        NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  label             text        NOT NULL,
  sort_order        integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chapter_choices_no_self_link CHECK (source_chapter_id <> target_chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_chapter_choices_source ON public.chapter_choices(source_chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_choices_target ON public.chapter_choices(target_chapter_id);

ALTER TABLE public.chapter_choices ENABLE ROW LEVEL SECURITY;

-- Readers can see choices leading out of any approved chapter.
CREATE POLICY "chapter_choices_select_approved"
  ON public.chapter_choices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chapters
    WHERE chapters.id = chapter_choices.source_chapter_id
      AND chapters.review_status = 'approved'
  ));

-- Creators can see/manage choices on their own stories regardless of status.
CREATE POLICY "chapter_choices_select_own"
  ON public.chapter_choices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chapters c
    JOIN public.stories s ON s.id = c.story_id
    WHERE c.id = chapter_choices.source_chapter_id
      AND s.created_by = auth.uid()
  ));

CREATE POLICY "chapter_choices_select_admin"
  ON public.chapter_choices FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "chapter_choices_all_own"
  ON public.chapter_choices FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.chapters c
    JOIN public.stories s ON s.id = c.story_id
    WHERE c.id = chapter_choices.source_chapter_id
      AND s.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chapters c
    JOIN public.stories s ON s.id = c.story_id
    WHERE c.id = chapter_choices.source_chapter_id
      AND s.created_by = auth.uid()
  ));

CREATE POLICY "chapter_choices_all_admin"
  ON public.chapter_choices FOR ALL
  USING (public.is_admin(auth.uid()));

-- ── Done ──────────────────────────────────────────────────────────────────────
-- Insert your first admin after running:
--
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE email = 'your@email.com';
