import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { createError } from "../middleware/errorHandler.js";
import { asyncHandler, parse, uuidParam, PaginationSchema, sendData } from "../utils/http.js";

const router = Router();

const CreateReviewSchema = z.object({
  storyId: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(1000),
  rating: z.number().int().min(1).max(5).optional(),
});

const UpdateReviewSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    content: z.string().trim().min(1).max(1000).optional(),
    rating: z.number().int().min(1).max(5).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update.");

async function ensureOwner(reviewId: string, userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("user_id")
    .eq("id", reviewId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw createError("Review not found.", 404);
  if (data.user_id !== userId) throw createError("Not authorized.", 403);
}

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { storyId, title, content, rating } = parse(CreateReviewSchema, req.body);

    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from("reviews")
      .select("id")
      .eq("user_id", req.user!.id)
      .eq("story_id", storyId)
      .maybeSingle();

    if (lookupErr) throw lookupErr;
    if (existing) throw createError("You already reviewed this story.", 409);

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .insert({ story_id: storyId, user_id: req.user!.id, title, content, rating, is_approved: true })
      .select()
      .single();

    if (error) throw error;
    sendData(res, data, 201);
  })
);

router.get(
  "/story/:storyId",
  asyncHandler(async (req, res) => {
    const storyId = uuidParam(req, "storyId");
    const { limit, offset } = parse(PaginationSchema, req.query);

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .select("*")
      .eq("story_id", storyId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    sendData(res, data ?? []);
  })
);

router.patch(
  "/:reviewId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const reviewId = uuidParam(req, "reviewId");
    const updates = parse(UpdateReviewSchema, req.body);
    await ensureOwner(reviewId, req.user!.id);

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .update(updates)
      .eq("id", reviewId)
      .select()
      .single();

    if (error) throw error;
    sendData(res, data);
  })
);

router.delete(
  "/:reviewId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const reviewId = uuidParam(req, "reviewId");
    await ensureOwner(reviewId, req.user!.id);

    const { error } = await supabaseAdmin.from("reviews").delete().eq("id", reviewId);
    if (error) throw error;

    sendData(res, { deleted: reviewId });
  })
);

router.post(
  "/:reviewId/helpful",
  requireAuth,
  asyncHandler(async (req, res) => {
    const reviewId = uuidParam(req, "reviewId");

    const { error } = await supabaseAdmin.rpc("increment_helpful_count", { review_id: reviewId });
    if (error) throw error;

    sendData(res, { reviewId });
  })
);

export default router;
