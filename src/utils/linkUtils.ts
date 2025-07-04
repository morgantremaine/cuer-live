import React from 'react';

// Utility function to detect URLs in text
export const isUrl = (text: string): boolean => {
  try {
    new URL(text);
    return true;
  } catch {
    // Also check for common URL patterns without protocol
    const urlPattern = /^(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
    return urlPattern.test(text.trim());
  }
};

// Utility function to ensure URL has protocol
export const ensureProtocol = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

// Component to render text with clickable links
export const renderTextWithLinks = (text: string, className?: string, style?: React.CSSProperties) => {
  if (!text) return text;

  // Simple URL detection pattern
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[a-zA-Z]{2,}[^\s]*)/g;
  const parts = text.split(urlPattern);
  
  return parts.map((part, index) => {
    if (urlPattern.test(part)) {
      const href = ensureProtocol(part);
      return React.createElement('a', {
        key: index,
        href,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: `text-blue-500 hover:text-blue-700 underline ${className || ''}`,
        style,
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
        }
      }, part);
    }
    return part;
  });
};