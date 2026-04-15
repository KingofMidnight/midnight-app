import DOMPurify from 'dompurify';

const config = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ol', 'ul', 'li',
    'h1', 'h2', 'h3', 'blockquote', 'code', 'pre', 'a'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
  FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  SANITIZE_DOM: true,
  SAFE_FOR_TEMPLATES: true,
  WHOLE_DOCUMENT: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false
};

export const sanitizeComment = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ...config,
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'a'],
    ALLOWED_ATTR: ['href'],
    FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror', 'target', 'rel']
  });
};

export const sanitizeChapterContent = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ...config,
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ol', 'ul', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
      'a', 'sub', 'sup'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
  });
};

export const sanitizeAdminContent = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ...config,
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'style'],
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ol', 'ul', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
      'a', 'sub', 'sup', 'span', 'div'
    ]
  });
};

export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

export const sanitizeUrl = (url: string): string => {
  if (!url.trim()) return '#';
  if (isValidUrl(url)) return url;
  return '#';
};
