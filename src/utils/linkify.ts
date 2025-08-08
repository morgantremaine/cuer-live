import React from 'react';

// URL detection regex - matches http/https URLs and email addresses
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

/**
 * Converts URLs in text to clickable links
 * @param text - The text to process
 * @returns React nodes with clickable links
 */
export const linkify = (text: string): React.ReactNode => {
  if (!text) return text;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex lastIndex to ensure proper matching
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const url = match[0];
    let href = url;

    // Add protocol if missing for www. URLs
    if (url.startsWith('www.')) {
      href = `https://${url}`;
    }

    // Add mailto: for email addresses
    if (url.includes('@') && !url.startsWith('http')) {
      href = `mailto:${url}`;
    }

    // Create clickable link
    parts.push(
      React.createElement('a', {
        key: `link-${match.index}`,
        href,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-blue-600 dark:text-blue-400 hover:underline cursor-pointer',
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(href, '_blank', 'noopener,noreferrer');
        },
        onMouseDown: (e: React.MouseEvent) => {
          e.stopPropagation(); // Prevent cell mouse down events
        }
      }, url)
    );

    lastIndex = URL_REGEX.lastIndex;
  }

  // Add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};