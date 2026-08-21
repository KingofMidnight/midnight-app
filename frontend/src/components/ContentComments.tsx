import { useContentComments } from "@/hooks/useContentComments";
import RichTextComment from "@/components/RichTextComment";
import { ThreadedComments } from "@/components/ThreadedComments";
import { MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContentCommentsProps {
  storyId: string;
  chapterId?: string;
  episodeId?: string;
  currentUserId?: string;
  title?: string;
}

const ContentComments = ({ storyId, chapterId, episodeId, currentUserId, title = "Comments" }: ContentCommentsProps) => {
  const { toast } = useToast();
  const { comments, commentCount, postComment, deleteComment } = useContentComments({ storyId, chapterId, episodeId });

  const handlePost = async (html: string) => {
    if (!currentUserId || !html.trim()) return;
    try {
      await postComment(currentUserId, html);
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleReply = async (parentCommentId: string, html: string) => {
    if (!currentUserId) return;
    await postComment(currentUserId, html, parentCommentId);
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <section>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" /> {title} ({commentCount})
      </h2>
      {currentUserId && (
        <div className="mb-6">
          <RichTextComment onSubmit={handlePost} />
        </div>
      )}
      <div className="space-y-3">
        <ThreadedComments comments={comments} currentUserId={currentUserId} onReply={handleReply} onDeleteComment={handleDelete} />
        {commentCount === 0 && <p className="text-muted-foreground text-sm">Be the first to leave a comment.</p>}
      </div>
    </section>
  );
};

export default ContentComments;
