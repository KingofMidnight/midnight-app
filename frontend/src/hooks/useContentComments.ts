import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CommentWithProfile } from "@/types/domain";

export interface ThreadedCommentNode {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  createdAt: string;
  replies: ThreadedCommentNode[];
  parentCommentId?: string | null;
}

type CommentNode = CommentWithProfile & { replies: CommentNode[] };

interface UseContentCommentsParams {
  storyId: string;
  chapterId?: string;
  episodeId?: string;
}

const buildCommentTree = (flatComments: CommentWithProfile[]): CommentNode[] => {
  const commentMap = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  flatComments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  flatComments.forEach((comment) => {
    const node = commentMap.get(comment.id);
    if (!node) return;

    const parent = comment.parent_comment_id ? commentMap.get(comment.parent_comment_id) : undefined;
    if (parent) {
      parent.replies.unshift(node);
      return;
    }
    roots.unshift(node);
  });

  return roots;
};

const insertCommentNode = (tree: CommentNode[], newComment: CommentNode): CommentNode[] => {
  if (!newComment.parent_comment_id) {
    return [newComment, ...tree];
  }

  return tree.map((node) => {
    if (node.id === newComment.parent_comment_id) {
      return { ...node, replies: [newComment, ...node.replies] };
    }
    return { ...node, replies: insertCommentNode(node.replies, newComment) };
  });
};

const removeCommentNode = (tree: CommentNode[], commentId: string): CommentNode[] =>
  tree
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({ ...comment, replies: removeCommentNode(comment.replies, commentId) }));

const countComments = (tree: CommentNode[]): number =>
  tree.reduce((count, comment) => count + 1 + countComments(comment.replies), 0);

const toThreadedComment = (tree: CommentNode[]): ThreadedCommentNode[] =>
  tree.map((comment) => ({
    id: comment.id,
    content: comment.content,
    userId: comment.user_id,
    userName: comment.profiles?.username ?? "User",
    userAvatar: comment.profiles?.avatar_url ?? undefined,
    createdAt: comment.created_at,
    replies: toThreadedComment(comment.replies),
    parentCommentId: comment.parent_comment_id,
  }));

export function useContentComments({ storyId, chapterId, episodeId }: UseContentCommentsParams) {
  const [tree, setTree] = useState<CommentNode[]>([]);
  const [loading, setLoading] = useState(true);

  const loadComments = useCallback(async () => {
    if (!storyId) return;
    setLoading(true);

    let query = supabase.from("comments").select("*").order("created_at", { ascending: false });
    query = chapterId
      ? query.eq("chapter_id", chapterId)
      : episodeId
        ? query.eq("episode_id", episodeId)
        : query.eq("story_id", storyId).is("chapter_id", null).is("episode_id", null);

    const { data } = await query;
    if (!data) {
      setTree([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(data.map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

    const flatComments = data.map((c) => ({
      ...c,
      profiles: profileMap.get(c.user_id) ?? null,
    })) as CommentWithProfile[];

    setTree(buildCommentTree(flatComments));
    setLoading(false);
  }, [storyId, chapterId, episodeId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const postComment = useCallback(
    async (userId: string, html: string, parentCommentId: string | null = null) => {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          user_id: userId,
          story_id: storyId,
          chapter_id: chapterId ?? null,
          episode_id: episodeId ?? null,
          content: html,
          parent_comment_id: parentCommentId,
        })
        .select("*")
        .single();

      if (error || !data) throw error ?? new Error("Failed to post comment.");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", userId)
        .single();

      const newNode: CommentNode = { ...data, profiles: profile ?? null, replies: [] };
      setTree((prev) => insertCommentNode(prev, newNode));
      return newNode;
    },
    [storyId, chapterId, episodeId]
  );

  const deleteComment = useCallback(async (commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) throw error;
    setTree((prev) => removeCommentNode(prev, commentId));
  }, []);

  return {
    comments: toThreadedComment(tree),
    commentCount: countComments(tree),
    loading,
    postComment,
    deleteComment,
    refresh: loadComments,
  };
}
