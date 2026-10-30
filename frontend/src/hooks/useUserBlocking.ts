import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// RLS also exposes rows where *I* am the one blocked, so every query is scoped to blocker_id = me.
async function currentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return user.id;
}

export const useUserBlocking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  const blockUser = useCallback(async (userId: string, reason?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: err } = await supabase.from("user_blocks").insert({
        blocker_id: await currentUserId(),
        blocked_id: userId,
        reason,
      });

      if (err) throw err;

      setBlockedUsers((prev) => [...prev, userId]);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Block failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const unblockUser = useCallback(async (userId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", await currentUserId())
        .eq("blocked_id", userId);

      if (err) throw err;

      setBlockedUsers((prev) => prev.filter((id) => id !== userId));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unblock failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const isUserBlocked = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("blocker_id", await currentUserId())
        .eq("blocked_id", userId)
        .maybeSingle();

      return !!data;
    } catch {
      return false;
    }
  }, []);

  const fetchBlockedUsers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("user_blocks")
        .select("blocked_id")
        .eq("blocker_id", await currentUserId());
      if (data) setBlockedUsers(data.map((b) => b.blocked_id));
    } catch (err) {
      console.error("Failed to fetch blocked users:", err);
    }
  }, []);

  return {
    loading,
    error,
    blockedUsers,
    blockUser,
    unblockUser,
    isUserBlocked,
    fetchBlockedUsers,
  };
};
