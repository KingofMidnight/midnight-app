import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Rating } from "@/components/ui/rating";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  title: string;
  content: string;
  rating: number;
  userName: string;
  createdAt: string;
  helpfulCount: number;
}

interface WrittenReviewsProps {
  storyId: string;
  reviews: Review[];
  onReviewAdded: (review: Review) => void;
  currentUserId?: string;
  userHasReviewed?: boolean;
}

export const WrittenReviews = ({
  storyId,
  reviews,
  onReviewAdded,
  currentUserId,
  userHasReviewed = false,
}: WrittenReviewsProps) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [loading, setLoading] = useState(false);

  const handleSubmitReview = useCallback(async () => {
    if (!title.trim() || !content.trim() || !currentUserId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.from("reviews").insert({
        story_id: storyId,
        user_id: currentUserId,
        title,
        content,
        rating,
        is_approved: true,
      });

      if (error) throw error;

      const newReview: Review = {
        id: data[0]?.id || "",
        title,
        content,
        rating,
        userName: "You",
        createdAt: new Date().toISOString(),
        helpfulCount: 0,
      };

      onReviewAdded(newReview);

      setTitle("");
      setContent("");
      setRating(5);
      setShowForm(false);
    } catch (error) {
      console.error("Failed to submit review:", error);
    } finally {
      setLoading(false);
    }
  }, [storyId, title, content, rating, currentUserId, onReviewAdded]);

  const handleHelpful = async (reviewId: string) => {
    try {
      await supabase
        .from("reviews")
        .update({ helpful_count: supabase.rpc("increment", { x: 1 }) })
        .eq("id", reviewId);
    } catch (error) {
      console.error("Failed to mark as helpful:", error);
    }
  };

  return (
    <div className="space-y-6">
      {currentUserId && !userHasReviewed && (
        <div className="bg-gray-50 p-4 rounded-lg">
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="w-full">
              Write a Review
            </Button>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="Review title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />

              <Textarea
                placeholder="Share your thoughts about this story..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                maxLength={1000}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Rating</label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitReview}
                  disabled={loading || !title.trim() || !content.trim()}
                >
                  Post Review
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No reviews yet</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{review.title}</h3>
                  <p className="text-sm text-gray-500">
                    by {review.userName} • {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < review.rating ? "text-yellow-400" : "text-gray-300"}>
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-sm text-gray-700">{review.content}</p>

              <button
                onClick={() => handleHelpful(review.id)}
                className="text-xs text-gray-500 hover:text-gray-700 mt-2"
              >
                👍 Helpful ({review.helpfulCount})
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
