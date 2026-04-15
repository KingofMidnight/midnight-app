import { Request, Response, NextFunction } from "express";
import { createError } from "./errorHandler";
import "../types/express";

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const FILE_SIGNATURES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46]
};

interface ValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
}

async function validateFileSignature(buffer: Buffer, mimeType: string): Promise<boolean> {
  const signature = FILE_SIGNATURES[mimeType as keyof typeof FILE_SIGNATURES];
  if (!signature) return false;

  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }
  return true;
}

export async function validateImageFile(file: Express.Multer.File): Promise<ValidationResult> {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds 5MB limit' };
  }

  const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'Invalid file extension. Only JPG, PNG, and WebP are allowed' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { valid: false, error: 'Invalid file type. Only images are allowed' };
  }

  try {
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(file.path);
    const isValidSignature = await validateFileSignature(buffer, file.mimetype);
    
    if (!isValidSignature) {
      await fs.unlink(file.path);
      return { valid: false, error: 'Invalid file format. File does not match its extension' };
    }
  } catch (error) {
    return { valid: false, error: 'Failed to validate file' };
  }

  return { valid: true, mimeType: file.mimetype };
}

export const validateUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.file && !req.files) {
    next();
    return;
  }

  try {
    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];
    
    for (const file of files) {
      if (!file) continue;
      
      const validation = await validateImageFile(file);
      if (!validation.valid) {
        const fs = await import('fs/promises');
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        if (req.files) {
          const allFiles = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
          await Promise.all(allFiles.map(f => fs.unlink(f.path).catch(() => {})));
        }
        
        res.status(400).json({ 
          success: false, 
          error: validation.error || 'Invalid file upload' 
        });
        return;
      }
    }
    
    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'File validation failed' 
    });
  }
};

export function validateImageUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Invalid URL' };
  }

  try {
    const parsedUrl = new URL(url);
    
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }

    const ext = parsedUrl.pathname.toLowerCase().split('.').pop();
    if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      return { valid: false, error: 'URL must point to a valid image file (JPG, PNG, or WebP)' };
    }

    if (process.env.NODE_ENV === 'production') {
      const hostname = parsedUrl.hostname.toLowerCase();
      if (hostname === 'localhost' || hostname.startsWith('127.') || 
          hostname.startsWith('192.168.') || hostname.startsWith('10.') ||
          hostname.startsWith('172.')) {
        return { valid: false, error: 'Private network URLs are not allowed' };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}
