import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import { terminateAllUserSessions } from "../utils/sessions.js";
import { asyncHandler, sendData } from "../utils/http.js";

const router = Router();

router.post(
  "/session/terminate-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await terminateAllUserSessions(req.user!.id))) {
      throw createError("Failed to terminate all sessions.", 500);
    }
    sendData(res, { message: "All sessions terminated successfully." });
  })
);

export default router;
