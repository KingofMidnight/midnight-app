import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import { requireAuth } from "../middleware/auth.js";
import { validateImageUrl } from "../utils/validation.js";
import { safeGet, SafeFetchError } from "../utils/safeFetch.js";

const router = Router();

router.get("/uploads/:filename", async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    
    if (!filename || typeof filename !== 'string') {
      res.status(400).json({ success: false, error: "Invalid filename" });
      return;
    }
    
    const sanitizedFilename = filename.replace(/\.\./g, '').replace(/[\\/]/g, '');
    
    if (!sanitizedFilename || sanitizedFilename !== filename) {
      res.status(400).json({ success: false, error: "Invalid filename" });
      return;
    }
    
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, sanitizedFilename);
    
    try {
      await fs.access(filePath);
      
      const resolvedPath = path.resolve(filePath);
      const resolvedUploadDir = path.resolve(uploadDir);
      
      if (!resolvedPath.startsWith(resolvedUploadDir)) {
        res.status(403).json({ success: false, error: "Access denied" });
        return;
      }
    } catch {
      res.status(404).json({ success: false, error: "File not found" });
      return;
    }
    
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      res.status(403).json({ success: false, error: "Access denied" });
      return;
    }
    
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentType = getContentType(ext);
    
    if (!contentType) {
      res.status(400).json({ success: false, error: "Unsupported file type" });
      return;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', stats.size.toString());
    
    const fileStream = await fs.open(filePath, 'r');
    const stream = fileStream.createReadStream();
    
    stream.on('error', async () => {
      await fileStream.close();
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: "File read error" });
      }
    });
    
    stream.on('end', async () => {
      await fileStream.close();
    });
    
    res.status(200);
    stream.pipe(res);
    
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

router.get("/proxy/image", async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, error: "URL parameter is required" });
      return;
    }
    
    const urlValidation = validateImageUrl(url);
    if (!urlValidation.valid) {
      res.status(400).json({ success: false, error: urlValidation.error });
      return;
    }
    
    const upstream = await safeGet(urlValidation.sanitized!);

    if (upstream.statusCode !== 200) {
      upstream.resume();
      res.status(502).json({ success: false, error: `Upstream returned ${upstream.statusCode}` });
      return;
    }

    const contentType = String(upstream.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    if (!PROXY_IMAGE_TYPES.has(contentType)) {
      upstream.destroy();
      res.status(400).json({ success: false, error: "URL does not point to a supported image" });
      return;
    }

    const declared = Number(upstream.headers['content-length'] ?? 0);
    if (declared > MAX_PROXY_BYTES) {
      upstream.destroy();
      res.status(413).json({ success: false, error: "Image too large" });
      return;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    let received = 0;
    upstream.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (received > MAX_PROXY_BYTES) {
        upstream.destroy();
        res.destroy();
      }
    });
    upstream.on('error', () => res.destroy());
    upstream.pipe(res);
  } catch (error) {
    if (!res.headersSent) {
      const status = error instanceof SafeFetchError ? error.status : 500;
      res.status(status).json({ success: false, error: error instanceof SafeFetchError ? error.message : "Proxy error" });
    }
  }
});

const MAX_PROXY_BYTES = 10 * 1024 * 1024;
const PROXY_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Raster images only: SVG/JS/CSS/HTML-like types could be used for stored XSS
function getContentType(ext: string): string | null {
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };

  return contentTypes[ext] || null;
}

export default router;
