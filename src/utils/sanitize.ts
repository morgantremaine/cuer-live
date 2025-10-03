import DOMPurify from 'dompurify';

// Safe HTML sanitization configuration
const createSanitizer = () => {
  return DOMPurify.sanitize;
};

// Sanitize HTML content for display
export const sanitizeHtml = (dirty: string): string => {
  if (!dirty) return '';
  
  const sanitizer = createSanitizer();
  return sanitizer(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 'span', 'div', 'p', 'br',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'pre', 'code',
      'a'
    ],
    ALLOWED_ATTR: [
      'class', 'href', 'target', 'rel'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  });
};

// Sanitize for rich text display (more permissive)
export const sanitizeRichText = (dirty: string): string => {
  if (!dirty) return '';
  
  const sanitizer = createSanitizer();
  return sanitizer(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 'span', 'div', 'p', 'br',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'pre', 'code',
      'a', 'input', 'label'
    ],
    ALLOWED_ATTR: [
      'class', 'href', 'target', 'rel', 'type', 'checked', 'disabled'
    ],
    ALLOW_DATA_ATTR: false
  });
};