import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

interface ProcessedImageResult {
  success: boolean;
  filePath?: string;
  error?: string;
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

const MAX_WIDTH = 2048;
const MAX_HEIGHT = 2048;
const QUALITY = 85;
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];

export async function processUploadedImage(inputPath: string, outputDir: string): Promise<ProcessedImageResult> {
  try {
    await fs.access(inputPath);
    
    const metadata = await sharp(inputPath).metadata();
    
    if (!metadata.format || !ALLOWED_FORMATS.includes(metadata.format)) {
      await fs.unlink(inputPath);
      return { success: false, error: `Unsupported image format: ${metadata.format}` };
    }
    
    const fileHash = crypto.randomBytes(16).toString('hex');
    const extension = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
    const filename = `${fileHash}.${extension}`;
    const outputPath = path.join(outputDir, filename);
    
    await fs.mkdir(outputDir, { recursive: true });
    
    let processor = sharp(inputPath);
    
    if (metadata.width && metadata.width > MAX_WIDTH) {
      processor = processor.resize(MAX_WIDTH, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }
    
    if (metadata.height && metadata.height > MAX_HEIGHT) {
      processor = processor.resize(null, MAX_HEIGHT, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }
    
    const result = await processor
      .normalize()
      .sharpen({ sigma: 1, m1: 1, m2: 2 })
      .toFormat(extension as keyof sharp.FormatEnum, {
        quality: QUALITY,
        progressive: true,
        mozjpeg: true
      })
      .toFile(outputPath);
    
    const finalMetadata = await sharp(outputPath).metadata();
    
    await fs.unlink(inputPath);
    
    return {
      success: true,
      filePath: outputPath,
      metadata: {
        width: finalMetadata.width || 0,
        height: finalMetadata.height || 0,
        format: finalMetadata.format || 'unknown',
        size: result.size || 0
      }
    };
    
  } catch (error) {
    try {
      await fs.unlink(inputPath);
    } catch {}
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Image processing failed'
    };
  }
}

export async function validateImageContent(buffer: Buffer): Promise<{ valid: boolean; format?: string; error?: string }> {
  try {
    const metadata = await sharp(buffer).metadata();
    
    if (!metadata.format || !ALLOWED_FORMATS.includes(metadata.format)) {
      return { valid: false, error: `Unsupported image format: ${metadata.format}` };
    }
    
    if (metadata.width && (metadata.width < 1 || metadata.width > 10000)) {
      return { valid: false, error: 'Invalid image dimensions' };
    }
    
    if (metadata.height && (metadata.height < 1 || metadata.height > 10000)) {
      return { valid: false, error: 'Invalid image dimensions' };
    }
    
    return { valid: true, format: metadata.format };
  } catch (error) {
    return { valid: false, error: 'Invalid image file' };
  }
}

export async function generateThumbnail(inputPath: string, outputDir: string, size: number = 300): Promise<ProcessedImageResult> {
  try {
    const metadata = await sharp(inputPath).metadata();
    
    if (!metadata.format) {
      return { success: false, error: 'Unknown image format' };
    }
    
    const fileHash = crypto.randomBytes(16).toString('hex');
    const extension = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
    const filename = `thumb_${fileHash}.${extension}`;
    const outputPath = path.join(outputDir, filename);
    
    await fs.mkdir(outputDir, { recursive: true });
    
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .toFormat(extension as keyof sharp.FormatEnum, {
        quality: 80
      })
      .toFile(outputPath);
    
    const thumbMetadata = await sharp(outputPath).metadata();
    
    return {
      success: true,
      filePath: outputPath,
      metadata: {
        width: thumbMetadata.width || 0,
        height: thumbMetadata.height || 0,
        format: thumbMetadata.format || 'unknown',
        size: 0
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Thumbnail generation failed'
    };
  }
}

export async function stripImageMetadata(inputPath: string, outputPath: string): Promise<ProcessedImageResult> {
  try {
    await sharp(inputPath)
      .withMetadata()
      .toFile(outputPath);
    
    const metadata = await sharp(outputPath).metadata();
    
    return {
      success: true,
      filePath: outputPath,
      metadata: {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: 0
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Metadata stripping failed'
    };
  }
}
