import { supabaseAdmin } from "../config/supabase";

const SESSION_EXPIRY_DAYS = 7;
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

export const createSession = async (
  userId: string,
  ipAddress: string,
  userAgent: string
): Promise<string | null> => {
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("user_sessions")
    .insert({
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt,
      is_active: true,
    })
    .select("id")
    .single();

  return error ? null : data?.id || null;
};

export const updateSessionActivity = async (sessionId: string): Promise<boolean> => {
  const { error } = await supabaseAdmin
    .from("user_sessions")
    .update({ last_activity: new Date().toISOString() })
    .eq("id", sessionId);

  return !error;
};

export const validateSession = async (sessionId: string): Promise<boolean> => {
  const { data, error } = await supabaseAdmin
    .from("user_sessions")
    .select("is_active, expires_at, last_activity")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) return false;

  const expiryTime = new Date(data.expires_at).getTime();
  const now = Date.now();

  if (expiryTime < now) return false;

  const lastActivityTime = new Date(data.last_activity).getTime();
  if (now - lastActivityTime > INACTIVITY_TIMEOUT_MS) {
    await terminateSession(sessionId);
    return false;
  }

  return data.is_active;
};

export const terminateSession = async (sessionId: string): Promise<boolean> => {
  const { error } = await supabaseAdmin
    .from("user_sessions")
    .update({ is_active: false })
    .eq("id", sessionId);

  return !error;
};

export const terminateAllUserSessions = async (userId: string): Promise<boolean> => {
  const { error } = await supabaseAdmin
    .from("user_sessions")
    .update({ is_active: false })
    .eq("user_id", userId);

  return !error;
};

export const cleanupExpiredSessions = async (): Promise<void> => {
  await supabaseAdmin
    .from("user_sessions")
    .update({ is_active: false })
    .lt("expires_at", new Date().toISOString());
};

export const getSessionExpiryTime = (): Date => {
  return new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
};

export const getInactivityTimeout = (): number => {
  return INACTIVITY_TIMEOUT_MS;
};
