import { Router, Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";
import { createError } from "../middleware/errorHandler";

const router = Router();

function getClientIp(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string') {
    return cfIp;
  }
  
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
  }
  
  return req.socket.remoteAddress ?? "unknown";
}

router.post(
  "/stories/:storyId",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { storyId } = req.params;
      const ip = getClientIp(req);

      const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: existing } = await supabaseAdmin
        .from("story_views")
        .select("id")
        .eq("story_id", storyId)
        .eq("ip_address", ip)
        .gte("viewed_at", windowStart)
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin.from("story_views").insert({
          story_id: storyId,
          ip_address: ip,
        });

        await supabaseAdmin.rpc("increment_story_view_count", { story_id_input: storyId });
      }

      const { data: story } = await supabaseAdmin
        .from("stories")
        .select("view_count")
        .eq("id", storyId)
        .single();

      res.json({ success: true, data: { view_count: story?.view_count ?? 0 } });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/stories/:storyId",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { storyId } = req.params;

      const { data: story, error } = await supabaseAdmin
        .from("stories")
        .select("view_count")
        .eq("id", storyId)
        .single();

      if (error || !story) throw createError("Story not found.", 404);

      res.json({ success: true, data: { view_count: story.view_count ?? 0 } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

