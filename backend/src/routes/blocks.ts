import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { blockUser, unblockUser, isUserBlocked, getBlockedUsers } from "../utils/userBlocks.js";

const router = Router();

const BlockUserSchema = z.object({
  blockedId: z.string().uuid(),
  reason: z.string().optional(),
});

const UnblockUserSchema = z.object({
  blockedId: z.string().uuid(),
});

router.post("/block", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { blockedId, reason } = BlockUserSchema.parse(req.body);

    if (req.user!.id === blockedId) {
      res.status(400).json({ success: false, error: "Cannot block yourself." });
      return;
    }

    const success = await blockUser(req.user!.id, blockedId, reason);
    if (!success) {
      res.status(400).json({ success: false, error: "User already blocked." });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: "Invalid request." });
  }
});

router.post("/unblock", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { blockedId } = UnblockUserSchema.parse(req.body);

    const success = await unblockUser(req.user!.id, blockedId);
    if (!success) {
      res.status(400).json({ success: false, error: "Failed to unblock." });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: "Invalid request." });
  }
});

router.get("/is-blocked/:userId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const blocked = await isUserBlocked(req.user!.id, userId);

    res.json({ success: true, blocked });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

router.get("/blocked-users", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const blocked = await getBlockedUsers(req.user!.id);
    res.json({ success: true, blockedUsers: blocked });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

export default router;
