import { Router, Request } from "express";
import { supabaseAdmin } from "../config/supabase";
import { createError } from "../middleware/errorHandler";
import { asyncHandler, uuidParam, sendData } from "../utils/http";

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

async function getViewCount(storyId: string): Promise<number> {
  const { data: story, error } = await supabaseAdmin
    .from("stories")
    .select("view_count")
    .eq("id", storyId)
    .maybeSingle();

  if (error) throw error;
  if (!story) throw createError("Story not found.", 404);
  return story.view_count ?? 0;
}

router.post(
  "/stories/:storyId",
  asyncHandler(async (req, res) => {
    const storyId = uuidParam(req, "storyId");
    const ip = getClientIp(req);

    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from("story_views")
      .select("id")
      .eq("story_id", storyId)
      .eq("ip_address", ip)
      .gte("viewed_at", windowStart)
      .limit(1);

    if (lookupErr) throw lookupErr;

    if (!existing?.length) {
      const before = await getViewCount(storyId);
      const { error: insertErr } = await supabaseAdmin.from("story_views").insert({ story_id: storyId, ip_address: ip });
      if (insertErr) throw insertErr;

      const { error: rpcErr } = await supabaseAdmin.rpc("increment_story_view_count", { story_id_input: storyId });
      if (rpcErr) throw rpcErr;

      return sendData(res, { view_count: before + 1 });
    }

    sendData(res, { view_count: await getViewCount(storyId) });
  })
);

router.get(
  "/stories/:storyId",
  asyncHandler(async (req, res) => {
    sendData(res, { view_count: await getViewCount(uuidParam(req, "storyId")) });
  })
);

export default router;
