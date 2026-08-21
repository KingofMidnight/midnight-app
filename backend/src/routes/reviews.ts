import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin, supabaseForUser } from "../config/supabase.js";

const router = Router();

const CreateReviewSchema = z.object({
  storyId: z.string().uuid(),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(1000),
  rating: z.number().int().min(1).max(5).optional(),
});

const UpdateReviewSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(1000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { storyId, title, content, rating } = CreateReviewSchema.parse(req.body);

    const existing = await supabaseAdmin
      .from("reviews")
      .select("id")
      .eq("user_id", req.user!.id)
      .eq("story_id", storyId)
      .maybeSingle();

    if (existing.data) {
      res.status(400).json({ success: false, error: "You already reviewed this story." });
      return;
    }

    const { data, error } = await supabaseAdmin.from("reviews").insert({
      story_id: storyId,
      user_id: req.user!.id,
      title,
      content,
      rating,
      is_approved: false,
    });

    if (error) throw error;

    res.status(201).json({ success: true, review: data?.[0] ?? null });
  } catch (error) {
    res.status(400).json({ success: false, error: "Invalid request." });
  }
});

router.get("/story/:storyId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { storyId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .select("*")
      .eq("story_id", storyId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json({ success: true, reviews: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

router.patch("/:reviewId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const updates = UpdateReviewSchema.parse(req.body);

    const existing = await supabaseAdmin
      .from("reviews")
      .select("user_id")
      .eq("id", reviewId)
      .maybeSingle();

    if (!existing.data || existing.data.user_id !== req.user!.id) {
      res.status(403).json({ success: false, error: "Not authorized." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .update(updates)
      .eq("id", reviewId)
      .select();

    if (error) throw error;

    res.json({ success: true, review: data?.[0] ?? null });
  } catch (error) {
    res.status(400).json({ success: false, error: "Invalid request." });
  }
});

router.delete("/:reviewId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;

    const existing = await supabaseAdmin
      .from("reviews")
      .select("user_id")
      .eq("id", reviewId)
      .maybeSingle();

    if (!existing.data || existing.data.user_id !== req.user!.id) {
      res.status(403).json({ success: false, error: "Not authorized." });
      return;
    }

    const { error } = await supabaseAdmin.from("reviews").delete().eq("id", reviewId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

router.post("/:reviewId/helpful", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;

    const { error } = await supabaseAdmin.rpc("increment_helpful_count", { review_id: reviewId });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

export default router;
