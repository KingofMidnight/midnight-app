import { Router } from "express";
import { z } from "zod";
import { requireAuth, getUserRoles } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { createError } from "../middleware/errorHandler.js";
import { asyncHandler, parse, uuidParam, PaginationSchema, sendData } from "../utils/http.js";

const router = Router();

const ContentRatingSchema = z.enum(["safe", "suggestive", "mature", "explicit"], {
  errorMap: () => ({ message: "Invalid rating." }),
});

const TrendingQuerySchema = PaginationSchema.extend({ rating: ContentRatingSchema.optional() });
const HighestRatedQuerySchema = PaginationSchema.extend({
  minRatings: z.coerce.number().int().min(1).max(10_000).default(5),
});
const UpdateStoryRatingSchema = z.object({ contentRating: ContentRatingSchema });

router.get(
  "/trending",
  asyncHandler(async (req, res) => {
    const { limit, offset, rating } = parse(TrendingQuerySchema, req.query);

    let query = supabaseAdmin
      .from("stories")
      .select("*, story_ratings_summary(average_rating, rating_count)")
      .eq("review_status", "approved");

    if (rating) query = query.eq("content_rating", rating);

    const { data, error } = await query
      .order("average_rating", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    sendData(res, data ?? []);
  })
);

router.get(
  "/highest-rated",
  asyncHandler(async (req, res) => {
    const { limit, offset, minRatings } = parse(HighestRatedQuerySchema, req.query);

    const { data, error } = await supabaseAdmin
      .from("story_ratings_summary")
      .select("story_id, average_rating, rating_count")
      .gte("rating_count", minRatings)
      .order("average_rating", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const storyIds = (data ?? []).map((r) => r.story_id).filter((id): id is string => id !== null);
    if (storyIds.length === 0) return sendData(res, []);

    const { data: stories, error: storiesError } = await supabaseAdmin
      .from("stories")
      .select("*")
      .in("id", storyIds)
      .eq("review_status", "approved");

    if (storiesError) throw storiesError;

    const byId = new Map((stories ?? []).map((s) => [s.id, s]));
    const enriched = (data ?? [])
      .filter((r) => r.story_id && byId.has(r.story_id))
      .map((r) => ({ ...byId.get(r.story_id!)!, average_rating: r.average_rating, rating_count: r.rating_count }));

    sendData(res, enriched);
  })
);

router.get(
  "/by-rating/:rating",
  asyncHandler(async (req, res) => {
    const rating = parse(ContentRatingSchema, req.params.rating);
    const { limit, offset } = parse(PaginationSchema, req.query);

    const { data, error } = await supabaseAdmin
      .from("stories")
      .select("*")
      .eq("content_rating", rating)
      .eq("review_status", "approved")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    sendData(res, data ?? []);
  })
);

router.patch(
  "/:storyId/rating",
  requireAuth,
  asyncHandler(async (req, res) => {
    const storyId = uuidParam(req, "storyId");
    const { contentRating } = parse(UpdateStoryRatingSchema, req.body);

    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from("stories")
      .select("created_by")
      .eq("id", storyId)
      .maybeSingle();

    if (lookupErr) throw lookupErr;
    if (!existing) throw createError("Story not found.", 404);

    const isOwner = existing.created_by === req.user!.id;
    if (!isOwner && !(await getUserRoles(req.user!.id)).includes("admin")) {
      throw createError("Not authorized.", 403);
    }

    const { data, error } = await supabaseAdmin
      .from("stories")
      .update({ content_rating: contentRating })
      .eq("id", storyId)
      .select()
      .single();

    if (error) throw error;
    sendData(res, data);
  })
);

export default router;
