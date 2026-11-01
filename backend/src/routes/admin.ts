import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin, getUserRoles } from "../middleware/auth";
import { supabaseAdmin } from "../config/supabase";
import { createError } from "../middleware/errorHandler";
import { asyncHandler, parse, uuidParam, sendData } from "../utils/http";

const router = Router();

router.use(requireAuth, requireAdmin);

type ProfileSummary = { username: string | null; display_name: string | null };

// stories.created_by / reports.reporter_id reference auth.users, not profiles,
// so PostgREST can't embed profiles(...) — look them up separately.
async function attachProfiles<T, K extends keyof T>(
  rows: T[],
  key: K
): Promise<(T & { profiles: ProfileSummary | null })[]> {
  const ids = [...new Set(rows.map((r) => r[key]).filter((v): v is NonNullable<T[K]> => v != null))] as string[];
  if (ids.length === 0) return rows.map((r) => ({ ...r, profiles: null }));

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, display_name")
    .in("id", ids);

  if (error) throw error;

  const byId = new Map((data ?? []).map((p) => [p.id, { username: p.username, display_name: p.display_name }]));
  return rows.map((r) => ({ ...r, profiles: byId.get(r[key] as string) ?? null }));
}

const ReviewSchema = z.object({
  status: z.enum(["approved", "rejected"], { errorMap: () => ({ message: "status must be 'approved' or 'rejected'." }) }),
});

const ResolveReportSchema = z.object({
  status: z.enum(["resolved", "dismissed", "reviewing"], {
    errorMap: () => ({ message: "status must be 'resolved', 'dismissed', or 'reviewing'." }),
  }),
  admin_notes: z.string().trim().max(2000).optional(),
});

const TIMEOUT_PRESETS = { "1h": 1, "24h": 24, "3d": 72, "7d": 168, "30d": 720 } as const;

const TimeoutSchema = z.object({
  duration: z.enum(Object.keys(TIMEOUT_PRESETS) as [keyof typeof TIMEOUT_PRESETS, ...(keyof typeof TIMEOUT_PRESETS)[]], {
    errorMap: () => ({ message: `duration must be one of: ${Object.keys(TIMEOUT_PRESETS).join(", ")}.` }),
  }),
  reason: z.string().trim().min(1, "reason is required.").max(500),
  message: z.string().trim().max(2000).optional(),
  reportId: z.string().uuid().optional(),
});

const BanSchema = z.object({
  reason: z.string().trim().min(1, "reason is required.").max(500),
  notes: z.string().max(2000).optional(),
  expires_at: z.string().datetime({ offset: true }).optional(),
});

router.get(
  "/pending",
  asyncHandler(async (_req, res) => {
    const [storiesRes, chaptersRes, episodesRes] = await Promise.all([
      supabaseAdmin.from("stories").select("*").eq("review_status", "pending").order("created_at"),
      supabaseAdmin
        .from("chapters")
        .select("*, stories(title, type, created_by)")
        .eq("review_status", "pending")
        .order("created_at"),
      supabaseAdmin
        .from("episodes")
        .select("*, stories(title, type, created_by)")
        .eq("review_status", "pending")
        .order("created_at"),
    ]);

    const failed = storiesRes.error ?? chaptersRes.error ?? episodesRes.error;
    if (failed) throw failed;

    sendData(res, {
      stories: await attachProfiles(storiesRes.data ?? [], "created_by"),
      chapters: chaptersRes.data ?? [],
      episodes: episodesRes.data ?? [],
    });
  })
);

const reviewRoute = (table: "stories" | "chapters" | "episodes", param: string, label: string) =>
  asyncHandler(async (req, res) => {
    const id = uuidParam(req, param);
    const { status } = parse(ReviewSchema, req.body);

    const { data, error } = await supabaseAdmin
      .from(table)
      .update({ review_status: status })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw createError(`${label} not found.`, 404);
    sendData(res, data);
  });

router.patch("/stories/:storyId/review", reviewRoute("stories", "storyId", "Story"));
router.patch("/chapters/:chapterId/review", reviewRoute("chapters", "chapterId", "Chapter"));
router.patch("/episodes/:episodeId/review", reviewRoute("episodes", "episodeId", "Episode"));

router.delete(
  "/comments/:commentId",
  asyncHandler(async (req, res) => {
    const commentId = uuidParam(req, "commentId");

    const { data, error } = await supabaseAdmin.from("comments").delete().eq("id", commentId).select("id");
    if (error) throw error;
    if (!data?.length) throw createError("Comment not found.", 404);

    sendData(res, { deleted: commentId });
  })
);

router.get(
  "/reports",
  asyncHandler(async (_req, res) => {
    const { data, error } = await supabaseAdmin
      .from("reports")
      .select("*, stories(title)")
      .eq("status", "pending")
      .order("created_at");

    if (error) throw error;
    sendData(res, await attachProfiles(data ?? [], "reporter_id"));
  })
);

router.patch(
  "/reports/:reportId/resolve",
  asyncHandler(async (req, res) => {
    const reportId = uuidParam(req, "reportId");
    const { status, admin_notes } = parse(ResolveReportSchema, req.body);

    const { data, error } = await supabaseAdmin
      .from("reports")
      .update({
        status,
        resolved_by: req.user!.id,
        resolved_at: new Date().toISOString(),
        ...(admin_notes ? { admin_notes } : {}),
      })
      .eq("id", reportId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw createError("Report not found.", 404);
    sendData(res, data);
  })
);

// Timeout: the user can still sign in and read, but can't post or edit
// (comments, reviews, reports, ratings, stories, chapters, episodes) until it expires.
router.post(
  "/users/:userId/timeout",
  asyncHandler(async (req, res) => {
    const userId = uuidParam(req, "userId");
    const { duration, reason, message, reportId } = parse(TimeoutSchema, req.body);

    if (userId === req.user!.id) throw createError("You cannot time yourself out.", 400);
    const roles = await getUserRoles(userId);
    if (roles.includes("admin") || roles.includes("moderator")) {
      throw createError("Admins and moderators cannot be timed out.", 403);
    }

    const { data: target, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userErr || !target?.user) throw createError("User not found.", 404);

    const expiresAt = new Date(Date.now() + TIMEOUT_PRESETS[duration] * 3_600_000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("user_moderation_actions")
      .insert({
        user_id: userId,
        action_type: "timeout",
        reason,
        message: message ?? null,
        report_id: reportId ?? null,
        issued_by: req.user!.id,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;
    sendData(res, data, 201);
  })
);

router.delete(
  "/users/:userId/timeout",
  asyncHandler(async (req, res) => {
    const userId = uuidParam(req, "userId");

    const { data, error } = await supabaseAdmin
      .from("user_moderation_actions")
      .update({ revoked_at: new Date().toISOString(), revoked_by: req.user!.id })
      .eq("user_id", userId)
      .eq("action_type", "timeout")
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("id");

    if (error) throw error;
    sendData(res, { revoked: data?.length ?? 0 });
  })
);

// Full moderation history for a user (timeouts now; warnings later)
router.get(
  "/users/:userId/moderation",
  asyncHandler(async (req, res) => {
    const userId = uuidParam(req, "userId");

    const { data, error } = await supabaseAdmin
      .from("user_moderation_actions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const now = Date.now();
    const activeTimeout = (data ?? []).find(
      (a) => a.action_type === "timeout" && !a.revoked_at && a.expires_at && new Date(a.expires_at).getTime() > now
    );
    sendData(res, { actions: data ?? [], timedOutUntil: activeTimeout?.expires_at ?? null });
  })
);

router.post(
  "/users/:userId/ban",
  asyncHandler(async (req, res) => {
    const userId = uuidParam(req, "userId");
    const { reason, notes, expires_at } = parse(BanSchema, req.body);

    if (userId === req.user!.id) throw createError("You cannot ban yourself.", 400);
    if ((await getUserRoles(userId)).includes("admin")) throw createError("Admins cannot be banned.", 403);

    const hours = expires_at
      ? Math.ceil((new Date(expires_at).getTime() - Date.now()) / 3_600_000)
      : 876_000;
    if (hours <= 0) throw createError("expires_at must be in the future.", 400);

    // Blocks sign-in and token refresh at the Supabase Auth level
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: `${hours}h`,
    });
    if (authErr) throw createError(authErr.message, authErr.status === 404 ? 404 : 500);

    const { data, error } = await supabaseAdmin
      .from("user_bans")
      .insert({
        user_id: userId,
        banned_by: req.user!.id,
        reason,
        notes: notes ?? null,
        expires_at: expires_at ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    sendData(res, data, 201);
  })
);

router.patch(
  "/users/:userId/unban",
  asyncHandler(async (req, res) => {
    const userId = uuidParam(req, "userId");

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });
    if (authErr) throw createError(authErr.message, authErr.status === 404 ? 404 : 500);

    const { error } = await supabaseAdmin
      .from("user_bans")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) throw error;
    sendData(res, { unbanned: userId });
  })
);

router.delete(
  "/users/:userId",
  asyncHandler(async (req, res) => {
    const userId = uuidParam(req, "userId");

    if (userId === req.user!.id) throw createError("You cannot delete your own account here.", 400);
    if ((await getUserRoles(userId)).includes("admin")) {
      throw createError("Remove the admin role before deleting this user.", 403);
    }

    // Cascades to profiles and everything referencing them; stories keep created_by = NULL
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw createError(error.message, error.status === 404 ? 404 : 500);

    sendData(res, { deleted: userId });
  })
);

export default router;
