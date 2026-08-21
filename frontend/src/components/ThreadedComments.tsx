import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { UserBlockButton } from "./UserBlockButton";
import RichTextComment from "@/components/RichTextComment";
import { MessageCircle, Reply, Trash2, User, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { sanitizeComment } from "@/utils/sanitize";

interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  createdAt: string;
  replies: Comment[];
  parentCommentId?: string | null;
}

interface ThreadedCommentsProps {
  comments: Comment[];
  currentUserId?: string;
  onReply: (parentCommentId: string, html: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => void;
}

export const ThreadedComments = ({
  comments,
  currentUserId,
  onReply,
  onDeleteComment,
}: ThreadedCommentsProps) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleReply = useCallback(
    async (parentCommentId: string, html: string) => {
      if (!html.trim()) return;

      setSubmitting(true);
      try {
        await onReply(parentCommentId, html);
        setReplyingTo(null);
      } catch (error) {
        console.error("Failed to post reply:", error);
      } finally {
        setSubmitting(false);
      }
    },
    [onReply]
  );

  const handleDelete = useCallback(
    (commentId: string) => {
      onDeleteComment?.(commentId);
    },
    [onDeleteComment]
  );

  const renderComment = (comment: Comment, depth = 0) => (
    <div
      key={comment.id}
      className={`${
        depth > 0
          ? "ml-6 border-l-2 border-gradient-to-r from-primary/20 to-primary/5 pl-6"
          : ""
      } group animate-in fade-in-0 slide-in-from-left-2 duration-300`}
    >
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-sm">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <Link to={`/profile/${comment.userId}`} className="block">
              {comment.userAvatar ? (
                <img
                  src={comment.userAvatar}
                  alt={comment.userName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/10 hover:ring-primary/30 transition-colors"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-primary/10 hover:ring-primary/30 transition-colors">
                  <User className="w-5 h-5 text-primary/60" />
                </div>
              )}
            </Link>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Link to={`/profile/${comment.userId}`} className="font-semibold text-foreground text-sm hover:text-primary transition-colors">
                  {comment.userName}
                </Link>
                {depth > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                    <Reply className="w-3 h-3" />
                    Reply
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {new Date(comment.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div
              className="text-sm text-foreground/90 leading-relaxed prose prose-sm prose-invert max-w-none mb-3"
              dangerouslySetInnerHTML={{ __html: sanitizeComment(comment.content) }}
            />

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(comment.id)}
                className="text-xs h-8 px-3"
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>
              {comment.userName !== "Anonymous" && (
                <UserBlockButton userId={comment.userId} userName={comment.userName} />
              )}
              {onDeleteComment && currentUserId === comment.userId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(comment.id)}
                  className="text-xs text-destructive h-8 px-3"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              )}
            </div>

            {replyingTo === comment.id && (
              <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="border-t border-border/50 pt-3">
                  <RichTextComment
                    onSubmit={(html) => handleReply(comment.id, html)}
                    disabled={submitting}
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReplyingTo(null)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => renderComment(reply, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-muted/50 rounded-full mb-4">
            <MessageCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No comments yet</h3>
          <p className="text-muted-foreground">Be the first to start the conversation!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  );
};
