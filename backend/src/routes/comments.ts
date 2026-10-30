import { Router } from "express";
import { z } from "zod";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { commentLimiter } from "../middleware/rateLimiter.js";
import { supabaseAdmin } from "../config/supabase.js";
import { createError } from "../middleware/errorHandler.js";
import { getBlockRelatedUsers } from "../utils/userBlocks.js";
import { sanitizeCommentHtml, validateTextContent } from "../utils/validation.js";
import { asyncHandler, parse, uuidParam, sendData } from "../utils/http.js";

const router = Router();

const CreateCommentSchema = z.object({
  storyId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  parentCommentId: z.string().uuid().optional(),
});

const UpdateCommentSchema = z.object({ content: z.string().min(1).max(5000) });

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

const prepareContent = (content: string): string => {
  const check = validateTextContent(content, 1, 5000);
  if (!check.valid) throw createError(check.error ?? "Invalid content.", 400);
  const html = sanitizeCommentHtml(content);
  if (!html.trim()) throw createError("Comment is empty after sanitization.", 400);
  return html;
};

async function ensureOwner(commentId: string, userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("comments")
    .select("user_id")
    .eq("id", commentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw createError("Comment not found.", 404);
  if (data.user_id !== userId) throw createError("Not authorized.", 403);
}

router.post(
  "/",
  requireAuth,
  commentLimiter,
  asyncHandler(async (req, res) => {
    const { storyId, content, parentCommentId } = parse(CreateCommentSchema, req.body);
    const html = prepareContent(content);

    if (parentCommentId) {
      const { data: parent, error: parentErr } = await supabaseAdmin
        .from("comments")
        .select("story_id")
        .eq("id", parentCommentId)
        .maybeSingle();
      if (parentErr) throw parentErr;
      if (!parent || parent.story_id !== storyId) throw createError("Parent comment not found on this story.", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("comments")
      .insert({
        story_id: storyId,
        user_id: req.user!.id,
        content: html,
        parent_comment_id: parentCommentId,
        is_approved: true,
      })
      .select()
      .single();

    if (error) throw error;
    sendData(res, data, 201);
  })
);

router.get(
  "/story/:storyId",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const storyId = uuidParam(req, "storyId");
    const hiddenUsers = req.user ? await getBlockRelatedUsers(req.user.id) : [];

    const { data, error } = await supabaseAdmin
      .from("comments")
      .select("*, profiles(username)")
      .eq("story_id", storyId)
      .eq("is_approved", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    sendData(res, buildCommentTree((data || []).filter((c) => !hiddenUsers.includes(c.user_id))));
  })
);

router.patch(
  "/:commentId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const commentId = uuidParam(req, "commentId");
    const html = prepareContent(parse(UpdateCommentSchema, req.body).content);
    await ensureOwner(commentId, req.user!.id);

    const { data, error } = await supabaseAdmin
      .from("comments")
      .update({ content: html })
      .eq("id", commentId)
      .select()
      .single();

    if (error) throw error;
    sendData(res, data);
  })
);

router.delete(
  "/:commentId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const commentId = uuidParam(req, "commentId");
    await ensureOwner(commentId, req.user!.id);

    const { error } = await supabaseAdmin.from("comments").delete().eq("id", commentId);
    if (error) throw error;

    sendData(res, { deleted: commentId });
  })
);

export default router;
