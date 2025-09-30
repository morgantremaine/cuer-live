import React from 'react';

/**
 * Check if text contains any formatting syntax
 */
export const containsFormatting = (text: string): boolean => {
  return /(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|~~.*?~~|<color:#[0-9a-fA-F]{6}>.*?<\/color>)/.test(text);
};

/**
 * Render formatted text with proper HTML styling
 * Supports: **bold**, *italic*, <u>underline</u>, ~~strikethrough~~, <color:#hex>text</color>
 */
export const renderFormattedText = (text: string): React.ReactElement => {
  if (!text) {
    return <></>;
  }

  const elements: React.ReactNode[] = [];
  let remaining = text;
  let keyCounter = 0;

  // Simple sequential replacement approach
  while (remaining.length > 0) {
    let foundMatch = false;

    // Try to find color tag
    const colorMatch = remaining.match(/^<color:(#[0-9a-fA-F]{6})>(.*?)<\/color>/);
    if (colorMatch) {
      elements.push(
        <span key={keyCounter++} style={{ color: colorMatch[1] }}>
          {colorMatch[2]}
        </span>
      );
      remaining = remaining.slice(colorMatch[0].length);
      foundMatch = true;
      continue;
    }

    // Try to find bold
    const boldMatch = remaining.match(/^\*\*(.*?)\*\*/);
    if (boldMatch) {
      elements.push(<strong key={keyCounter++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      foundMatch = true;
      continue;
    }

    // Try to find italic (single asterisk not preceded/followed by another)
    const italicMatch = remaining.match(/^\*([^*]+?)\*/);
    if (italicMatch && !remaining.startsWith('**')) {
      elements.push(<em key={keyCounter++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      foundMatch = true;
      continue;
    }

    // Try to find underline
    const underlineMatch = remaining.match(/^<u>(.*?)<\/u>/);
    if (underlineMatch) {
      elements.push(<u key={keyCounter++}>{underlineMatch[1]}</u>);
      remaining = remaining.slice(underlineMatch[0].length);
      foundMatch = true;
      continue;
    }

    // Try to find strikethrough
    const strikeMatch = remaining.match(/^~~(.*?)~~/);
    if (strikeMatch) {
      elements.push(<s key={keyCounter++}>{strikeMatch[1]}</s>);
      remaining = remaining.slice(strikeMatch[0].length);
      foundMatch = true;
      continue;
    }

    // No match found, add the first character as plain text
    if (!foundMatch) {
      elements.push(remaining[0]);
      remaining = remaining.slice(1);
    }
  }

  return <>{elements}</>;
};
