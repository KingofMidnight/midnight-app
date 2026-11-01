import { supabaseAdmin } from "../config/supabase";
import { createError } from "../middleware/errorHandler";
import { getUserRoles } from "../middleware/auth";
import type { Database } from "../types/database";

type ModerationAction = Database["public"]["Tables"]["user_moderation_actions"]["Row"];
type ModerationType = Database["public"]["Enums"]["moderation_action_type"];

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

// Shared guard for warnings/timeouts: target must exist, can't be yourself or staff.
export async function assertModeratable(targetId: string, actorId: string, verb: string): Promise<void> {
  if (targetId === actorId) throw createError(`You cannot ${verb} yourself.`, 400);
  const roles = await getUserRoles(targetId);
  if (roles.includes("admin") || roles.includes("moderator")) {
    throw createError(`Admins and moderators cannot be ${verb === "warn" ? "warned" : "timed out"}.`, 403);
  }
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(targetId);
  if (error || !data?.user) throw createError("User not found.", 404);
}

// Records the action and sends the user an in-app notification (bell icon + notices page).
export async function issueModerationAction(input: {
  userId: string;
  issuedBy: string;
  type: ModerationType;
  reason: string;
  message?: string | null;
  reportId?: string | null;
  expiresAt?: string | null;
}): Promise<ModerationAction> {
  const { data, error } = await supabaseAdmin
    .from("user_moderation_actions")
    .insert({
      user_id: input.userId,
      action_type: input.type,
      reason: input.reason,
      message: input.message ?? null,
      report_id: input.reportId ?? null,
      issued_by: input.issuedBy,
      expires_at: input.expiresAt ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  const title = input.type === "warning"
    ? "You received a warning from the moderators"
    : `You are timed out until ${new Date(input.expiresAt!).toUTCString()}`;
  const body = [`Reason: ${input.reason}`, input.message].filter(Boolean).join("\n\n");

  // A failed notification must not undo the moderation action itself
  const { error: notifyErr } = await supabaseAdmin.from("notifications").insert({
    user_id: input.userId,
    type: "moderation",
    title,
    message: body,
    link: "/notices",
  });
  if (notifyErr) console.error("[moderation] failed to notify user", notifyErr.message);

  return data;
}
