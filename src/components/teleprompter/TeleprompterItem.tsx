
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  isFullscreen?: boolean;
}

const TeleprompterItem = ({ 
  item, 
  fontSize, 
  isUppercase, 
  isBold,
  getRowNumber, 
  onUpdateScript,
  canEdit = false,
  isFullscreen = false
}: TeleprompterItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.script || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Memoize formatting functions for better performance
  const formatText = useCallback((text: string) => {
    return isUppercase ? text.toUpperCase() : text;
  }, [isUppercase]);

  const getFontWeight = useCallback(() => {
    return isBold ? 'font-bold' : 'font-normal';
  }, [isBold]);

  // Memoize rendered script content to prevent color glitches
  const renderedScript = useMemo(() => {
    if (!item.script) return null;
    return renderScriptWithBrackets(item.script, { 
      isUppercase, 
      isBold, 
      fontSize, 
      inlineDisplay: false 
    });
  }, [item.script, isUppercase, isBold, fontSize]);

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


  // Memoize event handlers to prevent unnecessary re-renders
  const handleScriptClick = useCallback(() => {
    if (canEdit && !isHeaderItem(item) && onUpdateScript) {
      // Store current scroll position to prevent jumping
      const container = document.querySelector('[data-teleprompter-container]');
      const currentScrollTop = container?.scrollTop || 0;
      
      setIsEditing(true);
      setEditText(item.script || '');
      
      // Restore scroll position after state update
      setTimeout(() => {
        if (container) {
          container.scrollTop = currentScrollTop;
        }
      }, 0);
    }
  }, [canEdit, item, onUpdateScript]);

  const handleScriptSave = useCallback(() => {
    if (onUpdateScript && editText !== item.script) {
      onUpdateScript(item.id, editText);
    }
    setIsEditing(false);
  }, [onUpdateScript, editText, item.script, item.id]);

  const handleScriptCancel = useCallback(() => {
    setEditText(item.script || '');
    setIsEditing(false);
  }, [item.script]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleScriptSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleScriptCancel();
    }
  }, [handleScriptSave, handleScriptCancel]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEditText(value);

    // Live-broadcast edits immediately (debounced save handled upstream)
    if (canEdit && onUpdateScript) {
      onUpdateScript(item.id, value);
    }

    // Auto-resize as user types
    setTimeout(() => {
      autoResizeTextarea();
    }, 0);
  }, [canEdit, onUpdateScript, item.id]);

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
    resize: 'none' as const,
    minHeight: '1.5em' // Ensure consistent minimum height
  };

  return (
    <div className="mb-8" data-item-id={item.id}>
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

      <div className={`text-left ${getFontWeight()} font-sans leading-relaxed relative`}>
        {/* Use absolute positioning to ensure no layout shift */}
        <div className="relative">
          {/* Display content - always rendered to maintain layout */}
          <div
            onClick={handleScriptClick}
            className={`${canEdit ? 'cursor-text' : ''} ${isEditing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            style={scriptStyles}
          >
            {isNullItem ? (
              // Never show placeholder in fullscreen mode
              (canEdit && !isFullscreen) ? (
                <span className={`text-gray-500 italic ${getFontWeight()} font-sans`}>Click to add script content...</span>
              ) : null
            ) : item.script ? (
              renderedScript
            ) : (
              // Never show placeholder in fullscreen mode
              (canEdit && !isFullscreen) ? (
                <span className={`text-gray-500 italic ${getFontWeight()} font-sans`}>Click to add script content...</span>
              ) : null
            )}
          </div>
          
          {/* Textarea - positioned absolutely to overlay */}
          {isEditing && (
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onBlur={handleScriptSave}
              className={`${getFontWeight()} font-sans focus:ring-0 focus:border-none absolute top-0 left-0`}
              style={{...scriptStyles, zIndex: 10}}
              placeholder="Enter script content..."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TeleprompterItem;
