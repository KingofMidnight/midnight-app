import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { createError } from "../middleware/errorHandler.js";
import { asyncHandler, uuidParam, sendData } from "../utils/http.js";

const router = Router();

router.use(requireAuth);

// The signed-in user's own warnings/timeouts. Internal fields (who issued it,
// linked report) are not exposed.
router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("user_moderation_actions")
      .select("id, action_type, reason, message, expires_at, revoked_at, acknowledged_at, created_at")
      .eq("user_id", req.user!.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const now = Date.now();
    const actions = (data ?? []).map((a) => ({
      ...a,
      active: !a.revoked_at && (a.action_type === "warning" || (!!a.expires_at && new Date(a.expires_at).getTime() > now)),
    }));
    const activeTimeout = actions.find((a) => a.action_type === "timeout" && a.active);

    sendData(res, {
      actions,
      timedOutUntil: activeTimeout?.expires_at ?? null,
      unacknowledged: actions.filter((a) => a.active && !a.acknowledged_at).length,
    });
  })
);

router.post(
  "/:actionId/acknowledge",
  asyncHandler(async (req, res) => {
    const actionId = uuidParam(req, "actionId");

    const { data, error } = await supabaseAdmin
      .from("user_moderation_actions")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", actionId)
      .eq("user_id", req.user!.id)
      .is("acknowledged_at", null)
      .select("id, acknowledged_at");

    if (error) throw error;
    if (!data?.length) {
      const { data: existing } = await supabaseAdmin
        .from("user_moderation_actions")
        .select("id")
        .eq("id", actionId)
        .eq("user_id", req.user!.id)
        .maybeSingle();
      if (!existing) throw createError("Notice not found.", 404);
    }

    sendData(res, { acknowledged: actionId });
  })
);

export default router;
