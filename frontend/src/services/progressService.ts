import { supabase } from "@/integrations/supabase/client";

interface SaveProgressParams {
  userId: string;
  storyId: string;
  chapterId?: string;
  episodeId?: string;
  isLastEntry: boolean;
}

async function markStoryCompleted(userId: string, storyId: string): Promise<void> {
  const { error } = await supabase
    .from("user_lists")
    .upsert(
      { user_id: userId, story_id: storyId, list: "completed" },
      { onConflict: "user_id,story_id" }
    );

  if (error) {
    console.error("Error marking story as completed:", error);
  }
}

export async function saveReadingProgress({
  userId,
  storyId,
  chapterId,
  episodeId,
  isLastEntry,
}: SaveProgressParams): Promise<void> {
  const progressPayload = chapterId
    ? { user_id: userId, story_id: storyId, last_chapter_id: chapterId }
    : { user_id: userId, story_id: storyId, last_episode_id: episodeId };

  const { error } = await supabase
    .from("user_progress")
    .upsert(progressPayload, { onConflict: "user_id,story_id" });

  if (error) {
    console.error("Error saving reading progress:", error);
    return;
  }

  if (isLastEntry) {
    await markStoryCompleted(userId, storyId);
  }
}
