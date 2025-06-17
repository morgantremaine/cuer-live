
import React from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

interface TeleprompterItemProps {
  item: RundownItem & { originalIndex: number };
  fontSize: number;
  isUppercase: boolean;
  getRowNumber: (index: number) => string;
}

const TeleprompterItem = ({ item, fontSize, isUppercase, getRowNumber }: TeleprompterItemProps) => {
  const formatText = (text: string) => {
    return isUppercase ? text.toUpperCase() : text;
  };

  // Function to parse and render script text with bracket styling
  const renderScriptWithBrackets = (text: string) => {
    // Regex to match brackets with optional color specification
    // Matches [TEXT] or [TEXT{COLOR}]
    const bracketRegex = /\[([^\[\]{}]+)(?:\{([^}]+)\})?\]/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = bracketRegex.exec(text)) !== null) {
      // Add text before the bracket
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {formatText(text.slice(lastIndex, match.index))}
          </span>
        );
      }

      // Extract the text and optional color from the match
      const bracketText = match[1]; // The text inside brackets
      const colorName = match[2]?.toLowerCase(); // The color name (if specified)

      // Determine background color
      let backgroundColor = 'white'; // default for simple brackets
      let textColor = 'black';

      if (colorName) {
        // Map common color names to CSS colors
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
        
        backgroundColor = colorMap[colorName] || colorName; // Use mapped color or raw color name
        textColor = 'white'; // White text on colored backgrounds for better contrast
      }

      // Add the styled bracket content with minimal top/bottom padding to match horizontal
      parts.push(
        <span
          key={`bracket-${match.index}`}
          className="py-0.5 px-2 inline-block rounded mx-1"
          style={{ 
            backgroundColor,
            color: textColor,
            fontSize: `${fontSize}px`
          }}
        >
          {formatText(bracketText)}
        </span>
      );

      lastIndex = bracketRegex.lastIndex;
    }

    // Add remaining text after the last bracket
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {formatText(text.slice(lastIndex))}
        </span>
      );
    }

    return parts.length > 0 ? parts : formatText(text);
  };

  if (isHeaderItem(item)) {
    return (
      <div className="mb-12">
        <h2 
          className="font-bold text-left mb-8"
          style={{ fontSize: `${fontSize + 8}px` }}
        >
          <span
            className="py-0.5 px-2 inline-block rounded"
            style={{ 
              backgroundColor: 'white',
              color: 'black',
              fontSize: `${fontSize + 8}px`
            }}
          >
            {getRowNumber(item.originalIndex)}: {formatText((item.segmentName || item.name)?.toUpperCase() || 'HEADER')}
          </span>
        </h2>
      </div>
    );
  }

  return (
    <div className="mb-16">
      {/* Segment Title */}
      <div 
        className="text-left mb-6"
        style={{ fontSize: `${fontSize + 4}px` }}
      >
        <span
          className="py-0.5 px-2 inline-block rounded"
          style={{ 
            backgroundColor: 'white',
            color: 'black',
            fontSize: `${fontSize + 4}px`
          }}
        >
          {getRowNumber(item.originalIndex)}: {formatText((item.segmentName || item.name)?.toUpperCase() || 'UNTITLED')}
        </span>
      </div>

      {/* Script with bracket parsing only - no talent content */}
      <div 
        className="leading-relaxed text-left whitespace-pre-wrap"
        style={{ 
          fontSize: `${fontSize}px`,
          lineHeight: '1.2'
        }}
      >
        {item.script ? renderScriptWithBrackets(item.script) : ''}
      </div>
    </div>
  );
};

export default TeleprompterItem;
