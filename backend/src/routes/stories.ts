import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";

const router = Router();

const UpdateStoryRatingSchema = z.object({
  contentRating: z.enum(["safe", "suggestive", "mature", "explicit"]),
});

router.get("/trending", async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 20, offset = 0, rating } = req.query;

    let query = supabaseAdmin
      .from("stories")
      .select("*, story_ratings_summary(average_rating, rating_count)")
      .eq("review_status", "approved");

    if (rating) {
      query = query.eq("content_rating", rating as string);
    }

    const { data, error } = await query
      .order("average_rating", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json({ success: true, stories: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

router.get("/highest-rated", async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 20, offset = 0, minRatings = 5 } = req.query;

    const { data, error } = await supabaseAdmin
      .from("story_ratings_summary")
      .select("story_id, average_rating, rating_count")
      .gte("rating_count", Number(minRatings))
      .order("average_rating", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    const storyIds = data?.map((r) => r.story_id) || [];
    if (storyIds.length === 0) {
      res.json({ success: true, stories: [] });
      return;
    }

    const { data: stories, error: storiesError } = await supabaseAdmin
      .from("stories")
      .select("*")
      .in("id", storyIds);

    if (storiesError) throw storiesError;

    const enriched = (stories || []).map((story) => {
      const rating = data?.find((r) => r.story_id === story.id);
      return { ...story, average_rating: rating?.average_rating, rating_count: rating?.rating_count };
    });

    res.json({ success: true, stories: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

router.get("/by-rating/:rating", async (req: Request, res: Response): Promise<void> => {
  try {
    const { rating } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const validRatings = ["safe", "suggestive", "mature", "explicit"];
    if (!validRatings.includes(rating)) {
      res.status(400).json({ success: false, error: "Invalid rating." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("stories")
      .select("*")
      .eq("content_rating", rating)
      .eq("review_status", "approved")
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json({ success: true, stories: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

router.patch("/:storyId/rating", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { storyId } = req.params;
    const { contentRating } = UpdateStoryRatingSchema.parse(req.body);

    const existing = await supabaseAdmin
      .from("stories")
      .select("created_by")
      .eq("id", storyId)
      .maybeSingle();

    if (!existing.data || existing.data.created_by !== req.user!.id) {
      res.status(403).json({ success: false, error: "Not authorized." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("stories")
      .update({ content_rating: contentRating })
      .eq("id", storyId)
      .select();

    if (error) throw error;

    res.json({ success: true, story: data[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: "Invalid request." });
  }
});

export default router;
