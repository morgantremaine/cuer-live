import React from 'react';

export const isNullScript = (script: string): boolean => {
  const trimmed = script.trim();
  return trimmed.toLowerCase() === '[null]';
};

export interface BracketParseOptions {
  isUppercase?: boolean;
  isBold?: boolean;
  fontSize?: number;
  inlineDisplay?: boolean; // For script column vs teleprompter
  showNullAsText?: boolean; // Show [null] as text instead of hiding it
}

// Memoization for script rendering to prevent unnecessary re-renders
const scriptCache = new Map<string, React.ReactNode>();

export const renderScriptWithBrackets = (
  text: string, 
  options: BracketParseOptions = {}
): React.ReactNode => {
  const { 
    isUppercase = false, 
    isBold = false, 
    fontSize = 16, 
    inlineDisplay = false,
    showNullAsText = false
  } = options;

  if (isNullScript(text) && !showNullAsText) {
    return null;
  }

  // Create cache key for memoization
  const cacheKey = `${text}-${isUppercase}-${isBold}-${fontSize}-${inlineDisplay}-${showNullAsText}`;
  if (scriptCache.has(cacheKey)) {
    return scriptCache.get(cacheKey);
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
  let partIndex = 0;
  let lastWasBracket = false;

  while ((match = bracketRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      let textContent = text.slice(lastIndex, match.index);
      // Trim leading whitespace if previous part was a bracket in teleprompter mode
      if (lastWasBracket && !inlineDisplay) {
        textContent = textContent.trimStart();
      }
      parts.push(
        React.createElement('span', {
          key: `${cacheKey}-text-${partIndex++}`,
          className: getFontWeight()
        }, formatText(textContent))
      );
    }
    lastWasBracket = false;

    const bracketText = match[1];
    const colorName = match[2]?.toLowerCase();

    // Special case: [null] should appear as normal text in main rundown
    if (bracketText.toLowerCase() === 'null' && showNullAsText) {
      parts.push(
        React.createElement('span', {
          key: `${cacheKey}-bracket-${partIndex++}`,
          className: getFontWeight()
        }, formatText(`[${bracketText}]`))
      );
    } else {
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
          key: `${cacheKey}-bracket-${partIndex++}`,
          className: `py-0.5 px-2 inline-flex rounded mx-0.5 my-0.5 ${getFontWeight()}`,
          style: { 
            backgroundColor,
            color: textColor,
            fontSize: `${fontSize}px`
          }
        }, formatText(bracketText))
      );

      // Add line break after bracket for teleprompter
      if (!inlineDisplay) {
        parts.push(
          React.createElement('br', {
            key: `${cacheKey}-br-${partIndex++}`
          })
        );
        lastWasBracket = true;
      }
    }


    lastIndex = bracketRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    let textContent = text.slice(lastIndex);
    // Trim leading whitespace if previous part was a bracket in teleprompter mode
    if (lastWasBracket && !inlineDisplay) {
      textContent = textContent.trimStart();
    }
    parts.push(
      React.createElement('span', {
        key: `${cacheKey}-text-${partIndex++}`,
        className: getFontWeight()
      }, formatText(textContent))
    );
  }

  const result = parts.length > 0 ? parts : React.createElement('span', {
    key: `${cacheKey}-single`,
    className: getFontWeight()
  }, formatText(text));

  // Cache the result
  scriptCache.set(cacheKey, result);
  
  // Limit cache size to prevent memory leaks
  if (scriptCache.size > 100) {
    const firstKey = scriptCache.keys().next().value;
    scriptCache.delete(firstKey);
  }

  return result;
};