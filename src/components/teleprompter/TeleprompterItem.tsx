
import React, { useState, useRef, useEffect } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { renderScriptWithBrackets, isNullScript } from '@/utils/scriptUtils';

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


  const getFontWeight = () => {
    return isBold ? 'font-bold' : 'font-normal';
  };

  // Auto-resize textarea to fit content
  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Set cursor to end of text
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
      // Initial resize
      setTimeout(() => {
        autoResizeTextarea();
      }, 0);
    }
  }, [isEditing]);


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
    // Auto-resize as user types
    setTimeout(() => {
      autoResizeTextarea();
    }, 0);
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

  // Common style object for consistent text rendering
  const scriptStyles = {
    fontSize: `${fontSize}px`,
    lineHeight: '1.5',
    fontFamily: 'inherit',
    fontWeight: isBold ? 'bold' : 'normal',
    whiteSpace: 'pre-wrap' as const,
    wordWrap: 'break-word' as const,
    margin: '0',
    padding: '0',
    width: '100%',
    backgroundColor: 'transparent',
    color: 'white',
    border: 'none',
    outline: 'none',
    resize: 'none' as const
  };

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

      <div className={`text-left ${getFontWeight()} font-sans leading-relaxed`}>
        {/* Conditional rendering: show either display content OR textarea */}
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onBlur={handleScriptSave}
            className={`${getFontWeight()} font-sans focus:ring-0 focus:border-none`}
            style={scriptStyles}
            placeholder="Enter script content..."
          />
        ) : (
          <div
            onClick={handleScriptClick}
            className={`${canEdit ? 'cursor-text' : ''}`}
            style={scriptStyles}
          >
            {isNullItem ? (
              canEdit ? (
                <span className={`text-gray-500 italic ${getFontWeight()} font-sans`}>Click to add script content...</span>
              ) : null
            ) : item.script ? (
              renderScriptWithBrackets(item.script, { 
                isUppercase, 
                isBold, 
                fontSize, 
                inlineDisplay: false 
              })
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
