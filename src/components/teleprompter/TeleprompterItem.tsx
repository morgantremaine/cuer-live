import React, { useState, useRef, useEffect } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

interface TeleprompterItemProps {
  item: RundownItem & { originalIndex: number };
  fontSize: number;
  isUppercase: boolean;
  isBold: boolean;
  getRowNumber: (index: number) => string;
  onUpdateScript?: (itemId: string, newScript: string) => void;
  canEdit?: boolean;
}

const TeleprompterItem = ({ 
  item, 
  fontSize, 
  isUppercase, 
  isBold,
  getRowNumber, 
  onUpdateScript,
  canEdit = false 
}: TeleprompterItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.script || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const formatText = (text: string) => {
    return isUppercase ? text.toUpperCase() : text;
  };

  // Helper function to check if script is null (case-insensitive)
  const isNullScript = (script: string) => {
    const trimmed = script.trim();
    return trimmed.toLowerCase() === '[null]';
  };

  // Get font weight class based on bold setting
  const getFontWeight = () => {
    return isBold ? 'font-bold' : 'font-normal';
  };

  // Auto-resize textarea and focus when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  // Function to parse and render script text with bracket styling
  const renderScriptWithBrackets = (text: string) => {
    // Handle [null] case (case-insensitive) - don't render any script content
    if (isNullScript(text)) {
      return null;
    }

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
          <span key={`text-${lastIndex}`} className={`${getFontWeight()} font-sans`}>
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
          className={`py-0.5 px-2 inline-block rounded mx-1 ${getFontWeight()} font-sans`}
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
        <span key={`text-${lastIndex}`} className={`${getFontWeight()} font-sans`}>
          {formatText(text.slice(lastIndex))}
        </span>
      );
    }

    return parts.length > 0 ? parts : <span className={`${getFontWeight()} font-sans`}>{formatText(text)}</span>;
  };

  const handleScriptClick = () => {
    if (canEdit && !isHeaderItem(item) && onUpdateScript) {
      setIsEditing(true);
      setEditText(item.script || '');
    }
  };

  const handleScriptSave = () => {
    if (onUpdateScript && editText !== item.script) {
      onUpdateScript(item.id, editText);
    }
    setIsEditing(false);
  };

  const handleScriptCancel = () => {
    setEditText(item.script || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleScriptSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleScriptCancel();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  if (isHeaderItem(item)) {
    // For headers, prioritize the name field which contains the custom text
    const headerTitle = item.name || item.segmentName || 'HEADER';
    
    return (
      <div className="mb-8">
        <h2 
          className={`${getFontWeight()} font-sans text-left mb-6`}
          style={{ fontSize: `${fontSize + 8}px` }}
        >
          <span
            className={`py-0.5 px-2 inline-block rounded ${getFontWeight()} font-sans`}
            style={{ 
              backgroundColor: 'white',
              color: 'black',
              fontSize: `${fontSize + 8}px`
            }}
          >
            {getRowNumber(item.originalIndex)} - {formatText(headerTitle.toUpperCase())}
          </span>
        </h2>
      </div>
    );
  }

  // Check if this is a [null] item (case-insensitive)
  const isNullItem = item.script && isNullScript(item.script);

  return (
    <div className="mb-8">
      {/* Segment Title */}
      <div 
        className="text-left mb-6"
        style={{ fontSize: `${fontSize + 4}px` }}
      >
        <span
          className={`py-0.5 px-2 inline-block rounded ${getFontWeight()} font-sans`}
          style={{ 
            backgroundColor: 'white',
            color: 'black',
            fontSize: `${fontSize + 4}px`
          }}
        >
          {getRowNumber(item.originalIndex)} - {formatText((item.segmentName || item.name)?.toUpperCase() || 'UNTITLED')}
        </span>
      </div>

      {/* Script with bracket parsing and editing capability */}
      <div className={`leading-relaxed text-left whitespace-pre-wrap ${getFontWeight()} font-sans`}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onBlur={handleScriptSave}
            className={`w-full bg-gray-800 text-white border border-gray-600 rounded p-3 resize-none overflow-hidden ${getFontWeight()} font-sans`}
            style={{ 
              fontSize: `${fontSize}px`,
              lineHeight: '1.2',
              minHeight: '100px'
            }}
            placeholder="Enter script content..."
          />
        ) : (
          <div
            onClick={handleScriptClick}
            className={`${canEdit ? 'cursor-text hover:bg-gray-900 hover:bg-opacity-30 rounded p-2 transition-colors' : ''}`}
            style={{ 
              fontSize: `${fontSize}px`,
              lineHeight: '1.2'
            }}
          >
            {isNullItem ? (
              // For [null] items, don't show any script content, but still show the segment title above
              canEdit ? (
                <span className={`text-gray-500 italic ${getFontWeight()} font-sans`}>Click to add script content...</span>
              ) : null
            ) : item.script ? (
              renderScriptWithBrackets(item.script)
            ) : (
              canEdit ? (
                <span className={`text-gray-500 italic ${getFontWeight()} font-sans`}>Click to add script content...</span>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeleprompterItem;
