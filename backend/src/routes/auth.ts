import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { authLimiter, twoFactorLimiter } from "../middleware/rateLimiter.js";
import { supabaseAdmin } from "../config/supabase.js";
import { createError } from "../middleware/errorHandler.js";
import {
  generate2FASecret,
  verify2FAToken,
  hashBackupCode,
  useBackupCode,
} from "../utils/twoFactorAuth.js";
import { createSession, validateSession, terminateSession, cleanupExpiredSessions } from "../utils/sessions.js";
import { asyncHandler, parse, sendData } from "../utils/http.js";

const router = Router();

const TokenSchema = z.object({
  token: z.string().regex(/^\d{6}$/, "Token must be 6 digits."),
});

const UseBackupCodeSchema = z.object({
  code: z.string().trim().min(1).max(32),
});

const Disable2FASchema = z
  .object({
    token: z.string().regex(/^\d{6}$/).optional(),
    code: z.string().trim().min(1).max(32).optional(),
  })
  .refine((v) => v.token || v.code, "Provide a 2FA token or a backup code.");

const SessionSchema = z.object({
  sessionId: z.string().uuid(),
});

async function get2FARecord(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_2fa_secrets")
    .select("secret, is_enabled, backup_codes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function requireEnabled2FA(userId: string) {
  const record = await get2FARecord(userId);
  if (!record?.is_enabled) throw createError("2FA not enabled.", 400);
  return record;
}

// Generates a new secret + backup codes and stores them (not yet enabled).
// The plaintext backup codes are returned exactly once; only hashes are stored.
router.post(
  "/2fa/setup",
  authLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user?.email) throw createError("Email not found in token.", 400);

    if ((await get2FARecord(req.user.id))?.is_enabled) {
      throw createError("2FA is already enabled. Disable it first.", 409);
    }

    const setup = await generate2FASecret(req.user.email);

    const { error } = await supabaseAdmin.from("user_2fa_secrets").upsert(
      {
        user_id: req.user.id,
        secret: setup.secret,
        is_enabled: false,
        backup_codes: setup.backupCodes.map(hashBackupCode),
      },
      { onConflict: "user_id" }
    );
    if (error) throw error;

    sendData(res, {
      secret: setup.secret,
      manualEntryKey: setup.manualEntryKey,
      otpauthUrl: setup.otpauthUrl,
      backupCodes: setup.backupCodes,
    });
  })
);

// Checks a token against the pending (stored) secret. Any client-sent secret is ignored.
router.post(
  "/2fa/verify-setup",
  requireAuth,
  twoFactorLimiter,
  asyncHandler(async (req, res) => {
    const { token } = parse(TokenSchema, req.body);
    const record = await get2FARecord(req.user!.id);

    if (!record) throw createError("Setup not found.", 400);
    if (!verify2FAToken(token, record.secret)) throw createError("Invalid token.", 400);

    sendData(res, { valid: true });
  })
);

router.post(
  "/2fa/enable",
  requireAuth,
  twoFactorLimiter,
  asyncHandler(async (req, res) => {
    const { token } = parse(TokenSchema, req.body);
    const record = await get2FARecord(req.user!.id);

    if (!record) throw createError("Setup not found.", 400);
    if (record.is_enabled) throw createError("2FA is already enabled.", 409);
    if (!verify2FAToken(token, record.secret)) throw createError("Invalid token.", 400);

    const { error } = await supabaseAdmin
      .from("user_2fa_secrets")
      .update({ is_enabled: true })
      .eq("user_id", req.user!.id);
    if (error) throw error;

    sendData(res, { enabled: true });
  })
);

router.post(
  "/2fa/verify",
  requireAuth,
  twoFactorLimiter,
  asyncHandler(async (req, res) => {
    const { token } = parse(TokenSchema, req.body);
    const record = await requireEnabled2FA(req.user!.id);

    if (!verify2FAToken(token, record.secret)) throw createError("Invalid token.", 400);

    sendData(res, { verified: true });
  })
);

router.post(
  "/2fa/backup-code",
  requireAuth,
  twoFactorLimiter,
  asyncHandler(async (req, res) => {
    const { code } = parse(UseBackupCodeSchema, req.body);
    const record = await requireEnabled2FA(req.user!.id);

    const { valid, remaining } = useBackupCode(code, record.backup_codes ?? []);
    if (!valid) throw createError("Invalid backup code.", 400);

    const { error } = await supabaseAdmin
      .from("user_2fa_secrets")
      .update({ backup_codes: remaining })
      .eq("user_id", req.user!.id);
    if (error) throw error;

    sendData(res, { remainingCodes: remaining.length });
  })
);

// Requires a current TOTP token or an unused backup code, so a stolen access
// token alone can't turn 2FA off.
router.post(
  "/2fa/disable",
  requireAuth,
  twoFactorLimiter,
  asyncHandler(async (req, res) => {
    const { token, code } = parse(Disable2FASchema, req.body ?? {});
    const record = await requireEnabled2FA(req.user!.id);

    const proven = token
      ? verify2FAToken(token, record.secret)
      : useBackupCode(code!, record.backup_codes ?? []).valid;
    if (!proven) throw createError("Invalid token or backup code.", 400);

    const { error } = await supabaseAdmin.from("user_2fa_secrets").delete().eq("user_id", req.user!.id);
    if (error) throw error;

    sendData(res, { enabled: false });
  })
);

async function hasActiveBan(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("user_bans")
    .select("expires_at")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) throw error;
  const now = Date.now();
  return (data ?? []).some((b) => !b.expires_at || new Date(b.expires_at).getTime() > now);
}

router.post(
  "/creator",
  authLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    if (await hasActiveBan(req.user!.id)) throw createError("Banned accounts cannot become creators.", 403);

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: req.user!.id, role: "creator" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) throw error;

    sendData(res, { role: "creator" });
  })
);

router.delete(
  "/creator",
  authLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", req.user!.id)
      .eq("role", "creator");
    if (roleErr) throw roleErr;

    const { error: archiveErr } = await supabaseAdmin
      .from("stories")
      .update({ review_status: "archived" })
      .eq("created_by", req.user!.id)
      .eq("review_status", "approved");
    if (archiveErr) throw archiveErr;

    sendData(res, { role: null });
  })
);

router.post(
  "/session/create",
  authLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessionId = await createSession(req.user!.id, (req.ip || "unknown").toString(), req.get("user-agent") || "unknown");
    if (!sessionId) throw createError("Failed to create session.", 500);

    sendData(res, { sessionId });
  })
);

router.post(
  "/session/validate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = parse(SessionSchema, req.body);
    sendData(res, { valid: await validateSession(sessionId, req.user!.id) });
  })
);

router.post(
  "/session/terminate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = parse(SessionSchema, req.body);
    if (!(await terminateSession(sessionId, req.user!.id))) throw createError("Session not found.", 404);

    sendData(res, { terminated: sessionId });
  })
);

router.post(
  "/session/cleanup",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    await cleanupExpiredSessions();
    sendData(res, { cleaned: true });
  })
);

export default router;
