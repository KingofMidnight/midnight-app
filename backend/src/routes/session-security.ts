import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { terminateAllUserSessions } from "../utils/sessions.js";

const router = Router();

router.post(
  "/session/terminate-all",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const success = await terminateAllUserSessions(req.user!.id);
      
      if (!success) {
        res.status(500).json({ success: false, error: "Failed to terminate all sessions." });
        return;
      }

      res.json({ success: true, message: "All sessions terminated successfully." });
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error." });
    }
  }
);

export default router;
