import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs/promises";
import { requireAuth } from "../middleware/auth";
import { generateEpub, generateChapterPdf } from "../services/exportService";
import { createError } from "../middleware/errorHandler";

const router = Router();

router.get(
  "/epub/:storyId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { storyId } = req.params;

      if (!storyId) throw createError("storyId is required.", 400);

      const filePath = await generateEpub(storyId);
      const filename = path.basename(filePath);

      res.setHeader("Content-Type", "application/epub+zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const buffer = await fs.readFile(filePath);
      res.send(buffer);

      fs.unlink(filePath).catch(() => {});
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/pdf/:chapterId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { chapterId } = req.params;

      if (!chapterId) throw createError("chapterId is required.", 400);

      const filePath = await generateChapterPdf(chapterId);
      const filename = path.basename(filePath);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const buffer = await fs.readFile(filePath);
      res.send(buffer);

      fs.unlink(filePath).catch(() => {});
    } catch (err) {
      next(err);
    }
  }
);

export default router;

