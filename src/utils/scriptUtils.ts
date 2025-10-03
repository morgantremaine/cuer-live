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

  while ((match = bracketRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        React.createElement('span', {
          key: `${cacheKey}-text-${partIndex++}`,
          className: getFontWeight()
        }, formatText(text.slice(lastIndex, match.index)))
      );
    }

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
          className: `py-0.5 px-2 ${inlineDisplay ? 'inline' : 'inline-block'} rounded mx-1 ${getFontWeight()}`,
          style: { 
            backgroundColor,
            color: textColor,
            fontSize: `${fontSize}px`
          }
        }, formatText(bracketText))
      );
    }


    lastIndex = bracketRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      React.createElement('span', {
        key: `${cacheKey}-text-${partIndex++}`,
        className: getFontWeight()
      }, formatText(text.slice(lastIndex)))
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

// Render rich text with both HTML tags and bracket syntax support
export const renderRichTextWithBrackets = (
  text: string,
  options: BracketParseOptions = {}
): React.ReactNode => {
  if (!text) return null;

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

  // Check if text contains HTML
  const hasHtml = /<[^>]+>/.test(text);
  
  if (!hasHtml) {
    // No HTML, use regular bracket rendering
    return renderScriptWithBrackets(text, options);
  }

  // Parse HTML and bracket syntax together
  const formatText = (text: string) => {
    return isUppercase ? text.toUpperCase() : text;
  };

  const getFontWeight = () => {
    return isBold ? 'font-bold' : 'font-normal';
  };

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;

  // Process text nodes to apply bracket syntax
  const processNode = (node: Node, key: string): React.ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent || '';
      const bracketRegex = /\[([^\[\]{}]+)(?:\{([^}]+)\})?\]/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      let partIndex = 0;

      while ((match = bracketRegex.exec(textContent)) !== null) {
        if (match.index > lastIndex) {
          parts.push(formatText(textContent.slice(lastIndex, match.index)));
        }

        const bracketText = match[1];
        const colorName = match[2]?.toLowerCase();

        if (bracketText.toLowerCase() === 'null' && showNullAsText) {
          parts.push(formatText(`[${bracketText}]`));
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
              key: `${key}-bracket-${partIndex++}`,
              className: `py-0.5 px-2 ${inlineDisplay ? 'inline' : 'inline-block'} rounded mx-1 ${getFontWeight()}`,
              style: { 
                backgroundColor,
                color: textColor,
                fontSize: `${fontSize}px`
              }
            }, formatText(bracketText))
          );
        }

        lastIndex = bracketRegex.lastIndex;
      }

      if (lastIndex < textContent.length) {
        parts.push(formatText(textContent.slice(lastIndex)));
      }

      return parts.length > 0 ? parts : formatText(textContent);
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const children = Array.from(element.childNodes).map((child, idx) => 
        processNode(child, `${key}-${idx}`)
      );

      const tagName = element.tagName.toLowerCase();
      const style: React.CSSProperties = {};
      
      // Preserve inline styles (mainly color)
      if (element.style.color) {
        style.color = element.style.color;
      }

      return React.createElement(
        tagName === 's' ? 's' : tagName,
        { key, style, className: getFontWeight() },
        children
      );
    }

    return null;
  };

  const result = Array.from(tempDiv.childNodes).map((node, idx) => 
    processNode(node, `root-${idx}`)
  );

  return result;
};