import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin, getUserRoles } from "../middleware/auth";
import { supabaseAdmin } from "../config/supabase";
import { createError } from "../middleware/errorHandler";

const router = Router();

router.use(requireAuth, requireAdmin);

const UuidSchema = z.string().uuid();

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

  if (error) throw createError(error.message, 500);

  const byId = new Map((data ?? []).map((p) => [p.id, { username: p.username, display_name: p.display_name }]));
  return rows.map((r) => ({ ...r, profiles: byId.get(r[key] as string) ?? null }));
}

router.get(
  "/pending",
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [storiesRes, chaptersRes, episodesRes] = await Promise.all([
        supabaseAdmin
          .from("stories")
          .select("*")
          .eq("review_status", "pending")
          .order("created_at"),
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
      if (failed) throw createError(failed.message, 500);

      res.json({
        success: true,
        data: {
          stories: await attachProfiles(storiesRes.data ?? [], "created_by"),
          chapters: chaptersRes.data ?? [],
          episodes: episodesRes.data ?? [],
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/stories/:storyId/review",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { storyId } = req.params;
      const { status } = req.body as { status: "approved" | "rejected" };

      if (!["approved", "rejected"].includes(status)) {
        throw createError("status must be 'approved' or 'rejected'.", 400);
      }

      const { data, error } = await supabaseAdmin
        .from("stories")
        .update({ review_status: status })
        .eq("id", storyId)
        .select()
        .single();

      if (error || !data) throw createError("Story not found.", 404);

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/chapters/:chapterId/review",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { chapterId } = req.params;
      const { status } = req.body as { status: "approved" | "rejected" };

      if (!["approved", "rejected"].includes(status)) {
        throw createError("status must be 'approved' or 'rejected'.", 400);
      }

      const { data, error } = await supabaseAdmin
        .from("chapters")
        .update({ review_status: status })
        .eq("id", chapterId)
        .select()
        .single();

      if (error || !data) throw createError("Chapter not found.", 404);

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/episodes/:episodeId/review",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { episodeId } = req.params;
      const { status } = req.body as { status: "approved" | "rejected" };

      if (!["approved", "rejected"].includes(status)) {
        throw createError("status must be 'approved' or 'rejected'.", 400);
      }

      const { data, error } = await supabaseAdmin
        .from("episodes")
        .update({ review_status: status })
        .eq("id", episodeId)
        .select()
        .single();

      if (error || !data) throw createError("Episode not found.", 404);

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/comments/:commentId",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { commentId } = req.params;

      const { error } = await supabaseAdmin
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw createError(error.message, 500);

      res.json({ success: true, data: { deleted: commentId } });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/reports",
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { data, error } = await supabaseAdmin
        .from("reports")
        .select("*, stories(title)")
        .eq("status", "pending")
        .order("created_at");

      if (error) throw createError(error.message, 500);

      res.json({ success: true, data: await attachProfiles(data ?? [], "reporter_id") });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/reports/:reportId/resolve",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reportId } = req.params;
      const { status, admin_notes } = req.body as {
        status: "resolved" | "dismissed" | "reviewing";
        admin_notes?: string;
      };

      if (!["resolved", "dismissed", "reviewing"].includes(status)) {
        throw createError("status must be 'resolved', 'dismissed', or 'reviewing'.", 400);
      }

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
        .single();

      if (error || !data) throw createError("Report not found.", 404);

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

const BanSchema = z.object({
  reason: z.string().trim().min(1, "reason is required.").max(500),
  notes: z.string().max(2000).optional(),
  expires_at: z.string().datetime({ offset: true }).optional(),
});

function parseUserId(req: Request): string {
  const parsed = UuidSchema.safeParse(req.params.userId);
  if (!parsed.success) throw createError("Invalid user id.", 400);
  return parsed.data;
}

router.post(
  "/users/:userId/ban",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = parseUserId(req);
      const body = BanSchema.safeParse(req.body);
      if (!body.success) throw createError(body.error.issues[0].message, 400);
      const { reason, notes, expires_at } = body.data;

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

      if (error) throw createError(error.message, 500);

      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/users/:userId/unban",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = parseUserId(req);

      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });
      if (authErr) throw createError(authErr.message, authErr.status === 404 ? 404 : 500);

      const { error } = await supabaseAdmin
        .from("user_bans")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) throw createError(error.message, 500);

      res.json({ success: true, data: { unbanned: userId } });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/users/:userId",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = parseUserId(req);

      if (userId === req.user!.id) throw createError("You cannot delete your own account here.", 400);
      if ((await getUserRoles(userId)).includes("admin")) {
        throw createError("Remove the admin role before deleting this user.", 403);
      }

      // Cascades to profiles and everything referencing them; stories keep created_by = NULL
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw createError(error.message, error.status === 404 ? 404 : 500);

      res.json({ success: true, data: { deleted: userId } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

