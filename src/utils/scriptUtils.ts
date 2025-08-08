import React from 'react';
import { linkify } from './linkify';

export const isNullScript = (script: string): boolean => {
  const trimmed = script.trim();
  return trimmed.toLowerCase() === '[null]';
};

export interface BracketParseOptions {
  isUppercase?: boolean;
  isBold?: boolean;
  fontSize?: number;
  inlineDisplay?: boolean; // For script column vs teleprompter
}

export const renderScriptWithBrackets = (
  text: string, 
  options: BracketParseOptions = {}
): React.ReactNode => {
  const { 
    isUppercase = false, 
    isBold = false, 
    fontSize = 16, 
    inlineDisplay = false 
  } = options;

  if (isNullScript(text)) {
    return null;
  }

  const formatText = (text: string) => {
    return isUppercase ? text.toUpperCase() : text;
  };

  const getFontWeight = () => {
    return isBold ? 'font-bold' : 'font-normal';
  };

  const bracketRegex = /\[([^\[\]{}]+)(?:\{([^}]+)\})?\]/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = bracketRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const textSegment = formatText(text.slice(lastIndex, match.index));
      parts.push(
        React.createElement('span', {
          key: `text-${lastIndex}`,
          className: getFontWeight()
        }, linkify(textSegment))
      );
    }

    const bracketText = match[1];
    const colorName = match[2]?.toLowerCase();

    let backgroundColor = 'white';
    let textColor = 'black';

    if (colorName) {
      const colorMap: { [key: string]: string } = {
        'red': '#ef4444',
        'blue': '#3b82f6',
        'green': '#22c55e',
        'yellow': '#eab308',
        'purple': '#a855f7',
        'orange': '#f97316',
        'pink': '#ec4899',
        'gray': '#6b7280',
        'grey': '#6b7280',
        'cyan': '#06b6d4',
        'lime': '#84cc16',
        'indigo': '#6366f1',
        'teal': '#14b8a6',
        'amber': '#f59e0b',
        'emerald': '#10b981',
        'violet': '#8b5cf6',
        'rose': '#f43f5e',
        'slate': '#64748b',
        'stone': '#78716c',
        'neutral': '#737373',
        'zinc': '#71717a'
      };
      
      backgroundColor = colorMap[colorName] || colorName;
      textColor = 'white';
    }

    parts.push(
      React.createElement('span', {
        key: `bracket-${match.index}`,
        className: `py-0.5 px-2 ${inlineDisplay ? 'inline' : 'inline-block'} rounded mx-1 ${getFontWeight()}`,
        style: { 
          backgroundColor,
          color: textColor,
          fontSize: `${fontSize}px`
        }
      }, formatText(bracketText))
    );


    lastIndex = bracketRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    const textSegment = formatText(text.slice(lastIndex));
    parts.push(
      React.createElement('span', {
        key: `text-${lastIndex}`,
        className: getFontWeight()
      }, linkify(textSegment))
    );
  }

  return parts.length > 0 ? parts : React.createElement('span', {
    className: getFontWeight()
  }, linkify(formatText(text)));
};