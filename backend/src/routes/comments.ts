import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { commentLimiter } from "../middleware/rateLimiter.js";
import { supabaseAdmin } from "../config/supabase.js";
import { getBlockedUsers } from "../utils/userBlocks.js";
import { sanitizeCommentHtml, validateTextContent } from "../utils/validation.js";

const router = Router();

const CreateCommentSchema = z.object({
  storyId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  parentCommentId: z.string().uuid().optional(),
});

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

router.post("/", requireAuth, commentLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { storyId, content, parentCommentId } = CreateCommentSchema.parse(req.body);

    const contentValidation = validateTextContent(content, 1, 5000);
    if (!contentValidation.valid) {
      res.status(400).json({ success: false, error: contentValidation.error });
      return;
    }

    const sanitizedContent = sanitizeCommentHtml(content);
    const { data, error } = await supabaseAdmin.from("comments").insert({
      story_id: storyId,
      user_id: req.user!.id,
      content: sanitizedContent,
      parent_comment_id: parentCommentId,
      is_approved: false,
    });

    if (error) throw error;

    res.status(201).json({ success: true, comment: data?.[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: "Invalid request." });
  }
});

router.get("/story/:storyId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { storyId } = req.params;
    const userId = req.user?.id;

    const blockedUsers = userId ? await getBlockedUsers(userId) : [];

    const { data, error } = await supabaseAdmin
      .from("comments")
      .select("*, profiles(username)")
      .eq("story_id", storyId)
      .eq("is_approved", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const filtered = (data || []).filter((comment) => !blockedUsers.includes(comment.user_id));

    const tree = buildCommentTree(filtered);

    res.json({ success: true, comments: tree });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

router.patch("/:commentId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const { content } = z.object({ content: z.string().min(1).max(5000) }).parse(req.body);

    const existing = await supabaseAdmin
      .from("comments")
      .select("user_id")
      .eq("id", commentId)
      .maybeSingle();

    if (!existing.data || existing.data.user_id !== req.user!.id) {
      res.status(403).json({ success: false, error: "Not authorized." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("comments")
      .update({ content })
      .eq("id", commentId)
      .select();

    if (error) throw error;

    res.json({ success: true, comment: data[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: "Invalid request." });
  }
});

router.delete("/:commentId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;

    const existing = await supabaseAdmin
      .from("comments")
      .select("user_id")
      .eq("id", commentId)
      .maybeSingle();

    if (!existing.data || existing.data.user_id !== req.user!.id) {
      res.status(403).json({ success: false, error: "Not authorized." });
      return;
    }

    const { error } = await supabaseAdmin.from("comments").delete().eq("id", commentId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

export default router;
