import { Router, Response } from "express";
import path from "path";
import fs from "fs/promises";
import { requireAuth } from "../middleware/auth";
import { generateEpub, generateChapterPdf } from "../services/exportService";
import { asyncHandler, uuidParam } from "../utils/http";

const router = Router();

async function sendAndDelete(res: Response, filePath: string, contentType: string): Promise<void> {
  try {
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
    res.send(await fs.readFile(filePath));
  } finally {
    fs.unlink(filePath).catch(() => {});
  }
}

router.get(
  "/epub/:storyId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const filePath = await generateEpub(uuidParam(req, "storyId"));
    await sendAndDelete(res, filePath, "application/epub+zip");
  })
);

router.get(
  "/pdf/:chapterId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const filePath = await generateChapterPdf(uuidParam(req, "chapterId"));
    await sendAndDelete(res, filePath, "application/pdf");
  })
);

export default router;
