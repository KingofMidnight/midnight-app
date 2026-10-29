import { supabaseAdmin } from "../config/supabase";

export const blockUser = async (blockerId: string, blockedId: string, reason?: string): Promise<boolean> => {
  if (blockerId === blockedId) return false;

  const { error } = await supabaseAdmin.from("user_blocks").insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
    reason,
  });

  return !error;
};

export const unblockUser = async (blockerId: string, blockedId: string): Promise<boolean> => {
  const { error } = await supabaseAdmin
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  return !error;
};

export const isUserBlocked = async (blockerId: string, blockedId: string): Promise<boolean> => {
  const { data, error } = await supabaseAdmin
    .from("user_blocks")
    .select("id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  return !error && !!data;
};

export const getBlockRelatedUsers = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabaseAdmin
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

  if (error) throw error;
  return (data ?? []).map((b) => (b.blocker_id === userId ? b.blocked_id : b.blocker_id));
};

export const getBlockedUsers = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabaseAdmin
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);

  if (error) return [];
  return data?.map((b) => b.blocked_id) || [];
};
