import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { commentLimiter } from "../middleware/rateLimiter.js";
import { supabaseAdmin } from "../config/supabase.js";
import { getBlockRelatedUsers } from "../utils/userBlocks.js";
import { sanitizeCommentHtml, validateTextContent } from "../utils/validation.js";

const router = Router();

const CreateCommentSchema = z.object({
  storyId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  parentCommentId: z.string().uuid().optional(),
});

const UpdateCommentSchema = z.object({ content: z.string().min(1).max(5000) });

const UuidSchema = z.string().uuid();

interface CommentNode {
  id: string;
  content: string;
  userId: string;
  userName: string;
  createdAt: string;
  replies: CommentNode[];
  parentCommentId?: string;
  isApproved?: boolean;
}

const buildCommentTree = (comments: any[]): CommentNode[] => {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  comments.forEach((comment) => {
    const node: CommentNode = {
      id: comment.id,
      content: comment.content,
      userId: comment.user_id,
      userName: comment.profiles?.username || "Anonymous",
      createdAt: comment.created_at,
      replies: [],
      parentCommentId: comment.parent_comment_id,
      isApproved: comment.is_approved,
    };
    map.set(comment.id, node);
  });

  comments.forEach((comment) => {
    const node = map.get(comment.id);
    if (!node) return;

    if (comment.parent_comment_id) {
      const parent = map.get(comment.parent_comment_id);
      if (parent) parent.replies.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const sendError = (res: Response, error: unknown): void => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ success: false, error: error.issues[0]?.message ?? "Invalid request." });
    return;
  }
  res.status(500).json({ success: false, error: "Internal server error." });
};

const prepareContent = (content: string): { ok: true; html: string } | { ok: false; error: string } => {
  const check = validateTextContent(content, 1, 5000);
  if (!check.valid) return { ok: false, error: check.error ?? "Invalid content." };
  const html = sanitizeCommentHtml(content);
  if (!html.trim()) return { ok: false, error: "Comment is empty after sanitization." };
  return { ok: true, html };
};

async function ensureOwner(commentId: string, userId: string, res: Response): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("comments")
    .select("user_id")
    .eq("id", commentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    res.status(404).json({ success: false, error: "Comment not found." });
    return false;
  }
  if (data.user_id !== userId) {
    res.status(403).json({ success: false, error: "Not authorized." });
    return false;
  }
  return true;
}

router.post("/", requireAuth, commentLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { storyId, content, parentCommentId } = CreateCommentSchema.parse(req.body);

    const prepared = prepareContent(content);
    if (!prepared.ok) {
      res.status(400).json({ success: false, error: prepared.error });
      return;
    }

    if (parentCommentId) {
      const { data: parent, error: parentErr } = await supabaseAdmin
        .from("comments")
        .select("story_id")
        .eq("id", parentCommentId)
        .maybeSingle();
      if (parentErr) throw parentErr;
      if (!parent || parent.story_id !== storyId) {
        res.status(400).json({ success: false, error: "Parent comment not found on this story." });
        return;
      }
    }

    const { data, error } = await supabaseAdmin
      .from("comments")
      .insert({
        story_id: storyId,
        user_id: req.user!.id,
        content: prepared.html,
        parent_comment_id: parentCommentId,
        is_approved: true,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, comment: data });
  } catch (error) {
    sendError(res, error);
  }
});

router.get("/story/:storyId", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const storyId = UuidSchema.parse(req.params.storyId);
    const hiddenUsers = req.user ? await getBlockRelatedUsers(req.user.id) : [];

    const { data, error } = await supabaseAdmin
      .from("comments")
      .select("*, profiles(username)")
      .eq("story_id", storyId)
      .eq("is_approved", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const filtered = (data || []).filter((comment) => !hiddenUsers.includes(comment.user_id));

    res.json({ success: true, comments: buildCommentTree(filtered) });
  } catch (error) {
    sendError(res, error);
  }
});

router.patch("/:commentId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const commentId = UuidSchema.parse(req.params.commentId);
    const { content } = UpdateCommentSchema.parse(req.body);

    const prepared = prepareContent(content);
    if (!prepared.ok) {
      res.status(400).json({ success: false, error: prepared.error });
      return;
    }

    if (!(await ensureOwner(commentId, req.user!.id, res))) return;

    const { data, error } = await supabaseAdmin
      .from("comments")
      .update({ content: prepared.html })
      .eq("id", commentId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, comment: data });
  } catch (error) {
    sendError(res, error);
  }
});

router.delete("/:commentId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const commentId = UuidSchema.parse(req.params.commentId);

    if (!(await ensureOwner(commentId, req.user!.id, res))) return;

    const { error } = await supabaseAdmin.from("comments").delete().eq("id", commentId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
