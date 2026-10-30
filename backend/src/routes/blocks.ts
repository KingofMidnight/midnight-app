import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import { blockUser, unblockUser, isUserBlocked, getBlockedUsers } from "../utils/userBlocks.js";
import { asyncHandler, parse, uuidParam, sendData } from "../utils/http.js";

const router = Router();

const BlockUserSchema = z.object({
  blockedId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

const UnblockUserSchema = z.object({
  blockedId: z.string().uuid(),
});

router.post(
  "/block",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { blockedId, reason } = parse(BlockUserSchema, req.body);

    if (req.user!.id === blockedId) throw createError("Cannot block yourself.", 400);
    if (!(await blockUser(req.user!.id, blockedId, reason))) throw createError("User already blocked.", 409);

    sendData(res, { blockedId });
  })
);

router.post(
  "/unblock",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { blockedId } = parse(UnblockUserSchema, req.body);

    if (!(await unblockUser(req.user!.id, blockedId))) throw createError("Failed to unblock.", 500);

    sendData(res, { blockedId });
  })
);

router.get(
  "/is-blocked/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = uuidParam(req, "userId");
    sendData(res, { blocked: await isUserBlocked(req.user!.id, userId) });
  })
);

router.get(
  "/blocked-users",
  requireAuth,
  asyncHandler(async (req, res) => {
    sendData(res, await getBlockedUsers(req.user!.id));
  })
);

export default router;
