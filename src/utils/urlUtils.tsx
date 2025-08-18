import React from 'react';

// URL detection regex that captures most common URL patterns
const URL_REGEX = /(https?:\/\/[^\s<>]+)/gi;

/**
 * Converts text containing URLs into JSX with clickable links
 * @param text - The text content that may contain URLs
 * @param className - Optional className for the container
 * @returns JSX element with clickable links
 */
export const renderTextWithClickableUrls = (text: string, className?: string): JSX.Element => {
  if (!text || typeof text !== 'string') {
    return <span className={className}>{text}</span>;
  }

  // Split text by URLs and create clickable links
  const parts = text.split(URL_REGEX);
  const elements: (string | JSX.Element)[] = [];

  parts.forEach((part, index) => {
    if (URL_REGEX.test(part)) {
      // This part is a URL, make it clickable
      elements.push(
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all pointer-events-auto"
          onClick={(e) => {
            // Prevent event bubbling to avoid triggering cell editing
            e.stopPropagation();
          }}
        >
          {part}
        </a>
      );
    } else if (part) {
      // This part is regular text
      elements.push(part);
    }
  });

  // Reset the regex for next use
  URL_REGEX.lastIndex = 0;

  return <span className={className}>{elements}</span>;
};

/**
 * Checks if a string contains any URLs
 * @param text - The text to check
 * @returns true if the text contains URLs, false otherwise
 */
export const containsUrls = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  
  const result = URL_REGEX.test(text);
  // Reset the regex for next use
  URL_REGEX.lastIndex = 0;
  return result;
};