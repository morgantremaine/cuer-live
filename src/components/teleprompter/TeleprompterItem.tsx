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

  const isNullScript = (script: string) => {
    const trimmed = script.trim();
    return trimmed.toLowerCase() === '[null]';
  };

  const getFontWeight = () => {
    return isBold ? 'font-bold' : 'font-normal';
  };

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const renderScriptWithBrackets = (text: string) => {
    if (isNullScript(text)) {
      return null;
    }

    const bracketRegex = /\[([^\[\]{}]+)(?:\{([^}]+)\})?\]/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = bracketRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className={`${getFontWeight()}`}>
            {formatText(text.slice(lastIndex, match.index))}
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
          className={`py-0.5 px-2 inline-block rounded mx-1 ${getFontWeight()}`}
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

    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className={`${getFontWeight()}`}>
          {formatText(text.slice(lastIndex))}
        </span>
      );
    }

    return parts.length > 0 ? parts : <span className={`${getFontWeight()}`}>{formatText(text)}</span>;
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
  };

  if (isHeaderItem(item)) {
    const headerTitle = item.name || item.segmentName || 'HEADER';
    
    return (
      <div className="mb-8">
        <h2 
          className={`${getFontWeight()} text-left mb-6 font-sans`}
          style={{ 
            fontSize: `${fontSize + 8}px`
          }}
        >
          <span
            className={`py-0.5 px-2 inline-block rounded ${getFontWeight()}`}
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

  const isNullItem = item.script && isNullScript(item.script);

  // Calculate consistent height for both states
  const baseHeight = isNullItem || !item.script ? '100px' : 'auto';

  return (
    <div className="mb-8">
      <div 
        className="text-left mb-6 font-sans"
        style={{ 
          fontSize: `${fontSize + 4}px`
        }}
      >
        <span
          className={`py-0.5 px-2 inline-block rounded ${getFontWeight()}`}
          style={{ 
            backgroundColor: 'white',
            color: 'black',
            fontSize: `${fontSize + 4}px`
          }}
        >
          {getRowNumber(item.originalIndex)} - {formatText((item.segmentName || item.name)?.toUpperCase() || 'UNTITLED')}
        </span>
      </div>

      <div 
        className={`text-left whitespace-pre-wrap ${getFontWeight()} font-sans leading-relaxed`}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onBlur={handleScriptSave}
            className={`w-full bg-transparent text-white border-none outline-none resize-none overflow-hidden ${getFontWeight()} font-sans focus:ring-0 focus:border-none`}
            style={{ 
              fontSize: `${fontSize}px`,
              lineHeight: '1.5',
              padding: '0',
              margin: '0',
              minHeight: baseHeight,
              height: baseHeight
            }}
            placeholder="Enter script content..."
          />
        ) : (
          <div
            onClick={handleScriptClick}
            className={`${canEdit ? 'cursor-text' : ''}`}
            style={{ 
              fontSize: `${fontSize}px`,
              lineHeight: '1.5',
              padding: '0',
              margin: '0',
              minHeight: baseHeight,
              height: baseHeight
            }}
          >
            {isNullItem ? (
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
