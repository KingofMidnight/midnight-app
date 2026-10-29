import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { supabaseAdmin } from "../config/supabase.js";
import {
  generate2FASecret,
  verify2FAToken,
  generateBackupCodes,
  useBackupCode,
} from "../utils/twoFactorAuth.js";
import { createSession, validateSession, terminateSession, cleanupExpiredSessions } from "../utils/sessions.js";

const router = Router();

const Setup2FASchema = z.object({
  email: z.string().email(),
});

const Verify2FASchema = z.object({
  token: z.string().regex(/^\d{6}$/),
  secret: z.string(),
});

const Enable2FASchema = z.object({
  token: z.string().regex(/^\d{6}$/),
  backupCodes: z.array(z.string()),
});

const Verify2FATokenSchema = z.object({
  token: z.string().regex(/^\d{6}$/),
});

const UseBackupCodeSchema = z.object({
  code: z.string(),
});

const VerifySessionSchema = z.object({
  sessionId: z.string().uuid(),
});

router.post(
  "/2fa/setup",
  authLimiter,
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = Setup2FASchema.parse(req.body);

      if (!req.user?.email) {
        res.status(400).json({ success: false, error: "Email not found in token." });
        return;
      }

      const setup = await generate2FASecret(req.user.email);

      res.json({
        success: true,
        secret: setup.secret,
        manualEntryKey: setup.manualEntryKey,
        backupCodes: setup.backupCodes,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: "Invalid request." });
    }
  }
);

router.post(
  "/2fa/verify-setup",
  authLimiter,
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, secret } = Verify2FASchema.parse(req.body);

      const isValid = verify2FAToken(token, secret);
      if (!isValid) {
        res.status(400).json({ success: false, error: "Invalid token." });
        return;
      }

      res.json({ success: true, valid: true });
    } catch (error) {
      res.status(400).json({ success: false, error: "Invalid request." });
    }
  }
);

router.post(
  "/2fa/enable",
  authLimiter,
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, backupCodes } = Enable2FASchema.parse(req.body);

      const { data: secrets } = await supabaseAdmin
        .from("user_2fa_secrets")
        .select("secret")
        .eq("user_id", req.user!.id)
        .maybeSingle();

      if (!secrets) {
        res.status(400).json({ success: false, error: "Setup not found." });
        return;
      }

      if (!verify2FAToken(token, secrets.secret)) {
        res.status(400).json({ success: false, error: "Invalid token." });
        return;
      }

      const { error } = await supabaseAdmin
        .from("user_2fa_secrets")
        .update({ is_enabled: true, backup_codes: backupCodes })
        .eq("user_id", req.user!.id);

      if (error) {
        res.status(500).json({ success: false, error: "Failed to enable 2FA." });
        return;
      }

      res.json({ success: true, message: "2FA enabled successfully." });
    } catch (error) {
      res.status(400).json({ success: false, error: "Invalid request." });
    }
  }
);

router.post(
  "/2fa/verify",
  authLimiter,
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = Verify2FATokenSchema.parse(req.body);

      const { data: secrets } = await supabaseAdmin
        .from("user_2fa_secrets")
        .select("secret")
        .eq("user_id", req.user!.id)
        .eq("is_enabled", true)
        .maybeSingle();

      if (!secrets) {
        res.status(400).json({ success: false, error: "2FA not enabled." });
        return;
      }

      const isValid = verify2FAToken(token, secrets.secret);
      if (!isValid) {
        res.status(400).json({ success: false, error: "Invalid token." });
        return;
      }

      res.json({ success: true, verified: true });
    } catch (error) {
      res.status(400).json({ success: false, error: "Invalid request." });
    }
  }
);

router.post(
  "/2fa/backup-code",
  authLimiter,
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = UseBackupCodeSchema.parse(req.body);

      const { data: secrets } = await supabaseAdmin
        .from("user_2fa_secrets")
        .select("backup_codes")
        .eq("user_id", req.user!.id)
        .eq("is_enabled", true)
        .maybeSingle();

      if (!secrets) {
        res.status(400).json({ success: false, error: "2FA not enabled." });
        return;
      }

      const { valid, remaining } = useBackupCode(code, secrets.backup_codes || []);
      if (!valid) {
        res.status(400).json({ success: false, error: "Invalid backup code." });
        return;
      }

      const { error } = await supabaseAdmin
        .from("user_2fa_secrets")
        .update({ backup_codes: remaining })
        .eq("user_id", req.user!.id);

      if (error) {
        res.status(500).json({ success: false, error: "Failed to use backup code." });
        return;
      }

      res.json({ success: true, remainingCodes: remaining.length });
    } catch (error) {
      res.status(400).json({ success: false, error: "Invalid request." });
    }
  }
);

router.post(
  "/2fa/disable",
  authLimiter,
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { error } = await supabaseAdmin
        .from("user_2fa_secrets")
        .update({ is_enabled: false })
        .eq("user_id", req.user!.id);

      if (error) {
        res.status(500).json({ success: false, error: "Failed to disable 2FA." });
        return;
      }

      res.json({ success: true, message: "2FA disabled." });
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error." });
    }
  }
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
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (await hasActiveBan(req.user!.id)) {
        res.status(403).json({ success: false, error: "Banned accounts cannot become creators." });
        return;
      }

      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: req.user!.id, role: "creator" },
          { onConflict: "user_id,role", ignoreDuplicates: true }
        );

      if (error) throw error;

      res.json({ success: true, data: { role: "creator" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to grant creator role." });
    }
  }
);

router.delete(
  "/creator",
  authLimiter,
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
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

      res.json({ success: true, data: { role: null } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to remove creator role." });
    }
  }
);

router.post(
  "/session/create",
  authLimiter,
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const ipAddress = (req.ip || "unknown").toString();
      const userAgent = req.get("user-agent") || "unknown";

      const sessionId = await createSession(req.user!.id, ipAddress, userAgent);
      if (!sessionId) {
        res.status(500).json({ success: false, error: "Failed to create session." });
        return;
      }

      res.json({ success: true, sessionId });
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error." });
    }
  }
);

router.post(
  "/session/validate",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = VerifySessionSchema.parse(req.body);
      const isValid = await validateSession(sessionId);

      res.json({ success: true, valid: isValid });
    } catch (error) {
      res.status(400).json({ success: false, error: "Invalid request." });
    }
  }
);

router.post(
  "/session/terminate",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = VerifySessionSchema.parse(req.body);
      const success = await terminateSession(sessionId);

      if (!success) {
        res.status(500).json({ success: false, error: "Failed to terminate session." });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ success: false, error: "Invalid request." });
    }
  }
);

router.post(
  "/session/cleanup",
  requireAuth,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      await cleanupExpiredSessions();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: "Cleanup failed." });
    }
  }
);

export default router;
