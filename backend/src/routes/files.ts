import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import { requireAuth } from "../middleware/auth.js";
import { validateImageUrl } from "../utils/validation.js";

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
    
    const response = await fetch(urlValidation.sanitized!, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)'
      }
    });
    
    if (!response.ok) {
      res.status(response.status).json({ 
        success: false, 
        error: `Failed to fetch image: ${response.statusText}` 
      });
      return;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      res.status(400).json({ success: false, error: "URL does not point to an image" });
      return;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    if (response.body) {
      const reader = response.body.getReader();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          } finally {
            reader.releaseLock();
          }
        }
      });
      
      stream.pipeTo(new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        }
      }));
    } else {
      res.end();
    }
    
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "Proxy error" });
    }
  }
});

function getContentType(ext: string): string | null {
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.css': 'text/css',
    '.js': 'application/javascript'
  };
  
  return contentTypes[ext] || null;
}

export default router;
