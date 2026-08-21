import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const COMMENT_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'a'],
  ALLOWED_ATTR: ['href'],
  FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  SANITIZE_DOM: true,
  SAFE_FOR_TEMPLATES: true
};

const CHAPTER_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ol', 'ul', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
    'a', 'sub', 'sup'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  SANITIZE_DOM: true,
  SAFE_FOR_TEMPLATES: true
};

export function sanitizeCommentHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';
  
  return purify.sanitize(dirty, COMMENT_CONFIG);
}

export function sanitizeChapterHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';
  
  return purify.sanitize(dirty, CHAPTER_CONFIG);
}

export function validateUrl(url: string): { valid: boolean; sanitized?: string; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Invalid URL' };
  }

  try {
    const sanitized = url.trim();
    const parsed = new URL(sanitized);
    
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }

    if (sanitized.toLowerCase().includes('javascript:') || 
        sanitized.toLowerCase().includes('data:') ||
        sanitized.toLowerCase().includes('vbscript:')) {
      return { valid: false, error: 'Dangerous URL protocol detected' };
    }

    return { valid: true, sanitized };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export function validateTextContent(
  content: string, 
  minLength: number = 1, 
  maxLength: number = 50000
): { valid: boolean; error?: string } {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Content is required' };
  }

  if (content.length < minLength) {
    return { valid: false, error: `Content must be at least ${minLength} characters` };
  }

  if (content.length > maxLength) {
    return { valid: false, error: `Content cannot exceed ${maxLength} characters` };
  }

  if (content.includes('\0') || content.includes('\u0000')) {
    return { valid: false, error: 'Invalid characters detected' };
  }

  return { valid: true };
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: 'Username cannot exceed 30 characters' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  if (trimmed.toLowerCase().includes('admin') || 
      trimmed.toLowerCase().includes('root') ||
      trimmed.toLowerCase().includes('system')) {
    return { valid: false, error: 'Username not allowed' };
  }

  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (trimmed.includes('..') || trimmed.startsWith('.') || trimmed.endsWith('.')) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

export function validateTitle(title: string): { valid: boolean; error?: string } {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Title is required' };
  }

  const trimmed = title.trim();
  
  if (trimmed.length < 1) {
    return { valid: false, error: 'Title cannot be empty' };
  }

  if (trimmed.length > 200) {
    return { valid: false, error: 'Title cannot exceed 200 characters' };
  }

  if (/<script|javascript:|on\w+=/i.test(trimmed)) {
    return { valid: false, error: 'Title contains invalid content' };
  }

  return { valid: true };
}

export function validateImageUrl(url: string): { valid: boolean; sanitized?: string; error?: string } {
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    return urlValidation;
  }

  const sanitized = urlValidation.sanitized!;
  const parsed = new URL(sanitized);
  
  const ext = parsed.pathname.toLowerCase().split('.').pop();
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
  
  if (!ext || !allowedExts.includes(ext)) {
    return { valid: false, error: 'Only JPG, PNG, and WebP images are allowed' };
  }

  return { valid: true, sanitized };
}
