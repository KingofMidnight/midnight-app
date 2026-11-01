import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { supabaseAdmin } from "../config/supabase.js";
import { createError } from "../middleware/errorHandler.js";
import { createSession, validateSession, terminateSession, cleanupExpiredSessions } from "../utils/sessions.js";
import { asyncHandler, parse, sendData } from "../utils/http.js";

// Two-factor authentication is handled by Supabase Auth MFA (see migration_007_mfa.sql
// and requireAuth), so this router only covers creator roles and session tracking.
const router = Router();

const SessionSchema = z.object({
  sessionId: z.string().uuid(),
});

async function hasActiveBan(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("user_bans")
    .select("expires_at")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) throw error;
  const now = Date.now();
  return (data ?? []).some((b) => !b.expires_at || new Date(b.expires_at).getTime() > now);
}

router.post(
  "/creator",
  authLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    if (await hasActiveBan(req.user!.id)) throw createError("Banned accounts cannot become creators.", 403);

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: req.user!.id, role: "creator" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) throw error;

    sendData(res, { role: "creator" });
  })
);

router.delete(
  "/creator",
  authLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", req.user!.id)
      .eq("role", "creator");
    if (roleErr) throw roleErr;

    const { error: archiveErr } = await supabaseAdmin
      .from("stories")
      .update({ review_status: "archived" })
      .eq("created_by", req.user!.id)
      .eq("review_status", "approved");
    if (archiveErr) throw archiveErr;

    sendData(res, { role: null });
  })
);

router.post(
  "/session/create",
  authLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessionId = await createSession(req.user!.id, (req.ip || "unknown").toString(), req.get("user-agent") || "unknown");
    if (!sessionId) throw createError("Failed to create session.", 500);

    sendData(res, { sessionId });
  })
);

router.post(
  "/session/validate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = parse(SessionSchema, req.body);
    sendData(res, { valid: await validateSession(sessionId, req.user!.id) });
  })
);

router.post(
  "/session/terminate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = parse(SessionSchema, req.body);
    if (!(await terminateSession(sessionId, req.user!.id))) throw createError("Session not found.", 404);

    sendData(res, { terminated: sessionId });
  })
);

router.post(
  "/session/cleanup",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    await cleanupExpiredSessions();
    sendData(res, { cleaned: true });
  })
);

export default router;
