
import React from 'react';

export const isNullScript = (script: string) => {
  const trimmed = script.trim();
  return trimmed.toLowerCase() === '[null]';
};

export const renderScriptWithBrackets = (text: string, fontSize = 14, isBold = false) => {
  if (isNullScript(text)) {
    return null;
  }

  const bracketRegex = /\[([^\[\]{}]+)(?:\{([^}]+)\})?\]/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  const getFontWeight = () => {
    return isBold ? 'font-bold' : 'font-normal';
  };

  while ((match = bracketRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} className={`${getFontWeight()}`}>
          {text.slice(lastIndex, match.index)}
        </span>
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
      <span
        key={`bracket-${match.index}`}
        className={`py-0.5 px-1 inline-block rounded mx-0.5 ${getFontWeight()}`}
        style={{ 
          backgroundColor,
          color: textColor,
          fontSize: `${fontSize}px`
        }}
      >
        {bracketText}
      </span>
    );

    lastIndex = bracketRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`} className={`${getFontWeight()}`}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  // Wrap all parts in a single inline container to prevent layout issues
  return (
    <span className="inline-flex flex-wrap items-center">
      {parts.length > 0 ? parts : <span className={`${getFontWeight()}`}>{text}</span>}
    </span>
  );
};
