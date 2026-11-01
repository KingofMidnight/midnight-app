import { supabaseAdmin } from "../config/supabase";
import { createError } from "../middleware/errorHandler";

export async function getActiveTimeoutUntil(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc("active_timeout_until", { _user_id: userId });
  if (error) throw error;
  return data ?? null;
}

// The database also enforces this (block_timed_out_users trigger); checking in
// the API first gives a clear 403 instead of a generic database error.
export async function assertNotTimedOut(userId: string): Promise<void> {
  const until = await getActiveTimeoutUntil(userId);
  if (until) {
    throw createError(`You are timed out until ${new Date(until).toUTCString()} and cannot post or edit content.`, 403, {
      timedOutUntil: until,
    });
  }
}
