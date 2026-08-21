import { Router, Request, Response, NextFunction } from "express";
import { requireAuth, requireAdmin, requireModerator } from "../middleware/auth";
import { supabaseAdmin } from "../config/supabase";
import { createError } from "../middleware/errorHandler";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  "/pending",
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [storiesRes, chaptersRes] = await Promise.all([
        supabaseAdmin
          .from("stories")
          .select("*, profiles(username, display_name)")
          .eq("review_status", "pending")
          .order("created_at"),
        supabaseAdmin
          .from("chapters")
          .select("*, stories(title, type)")
          .eq("review_status", "pending")
          .order("created_at"),
      ]);

      res.json({
        success: true,
        data: {
          stories: storiesRes.data ?? [],
          chapters: chaptersRes.data ?? [],
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
        .select("*, profiles(username, display_name), stories(title)")
        .eq("status", "pending")
        .order("created_at");

      if (error) throw createError(error.message, 500);

      res.json({ success: true, data: data ?? [] });
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

router.post(
  "/users/:userId/ban",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { reason, notes, expires_at } = req.body as {
        reason: string;
        notes?: string;
        expires_at?: string;
      };

      if (!reason) throw createError("reason is required.", 400);

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
      const { userId } = req.params;

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

export default router;

