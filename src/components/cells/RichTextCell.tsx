import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sanitizeCellRichText } from '@/utils/sanitize';
import { renderRichTextWithBrackets } from '@/utils/scriptUtils';

export interface FormatStates {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}

interface RichTextCellProps {
  value: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement | HTMLDivElement }>;
  textColor?: string;
  backgroundColor?: string;
  onUpdateValue: (value: string) => void;
  onCellClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onFormatStateChange?: (states: FormatStates) => void;
  onFocusChange?: (element: HTMLDivElement | null) => void;
  fieldKeyForProtection?: string;
}

const RichTextCell = ({
  value,
  itemId,
  cellRefKey,
  cellRefs,
  textColor,
  backgroundColor,
  onUpdateValue,
  onCellClick,
  onKeyDown,
  onFormatStateChange,
  onFocusChange,
  fieldKeyForProtection
}: RichTextCellProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const [calculatedHeight, setCalculatedHeight] = useState<number>(38);
  const [currentWidth, setCurrentWidth] = useState<number>(0);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [formatStates, setFormatStates] = useState<FormatStates>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false
  });

  // Check if content contains HTML tags
  const isHtmlContent = (text: string): boolean => {
    return /<[^>]+>/.test(text);
  };

  // Update format states at cursor position
  const updateFormatStates = useCallback(() => {
    const states = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough')
    };
    setFormatStates(states);
    onFormatStateChange?.(states);
  }, [onFormatStateChange]);

  // Apply formatting to selected text
  const applyFormat = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const sanitized = sanitizeCellRichText(editorRef.current.innerHTML);
      onUpdateValue(sanitized);
      setTimeout(updateFormatStates, 0);
    }
  }, [onUpdateValue, updateFormatStates]);

  // Expose formatting functions for toolbar
  useEffect(() => {
    const element = editorRef.current;
    if (element) {
      (element as any).applyBold = () => applyFormat('bold');
      (element as any).applyItalic = () => applyFormat('italic');
      (element as any).applyUnderline = () => applyFormat('underline');
      (element as any).applyStrikethrough = () => applyFormat('strikeThrough');
      (element as any).applyTextColor = (color: string) => applyFormat('foreColor', color);
    }
  }, [applyFormat]);

  // Function to calculate required height
  const calculateHeight = () => {
    if (!editorRef.current || !measurementRef.current) return;
    
    const editor = editorRef.current;
    const measurementDiv = measurementRef.current;
    
    const editorWidth = editor.clientWidth;
    setCurrentWidth(editorWidth);
    
    const computedStyle = window.getComputedStyle(editor);
    measurementDiv.style.width = `${editorWidth}px`;
    measurementDiv.style.fontSize = computedStyle.fontSize;
    measurementDiv.style.fontFamily = computedStyle.fontFamily;
    measurementDiv.style.fontWeight = computedStyle.fontWeight;
    measurementDiv.style.lineHeight = computedStyle.lineHeight;
    measurementDiv.style.padding = computedStyle.padding;
    measurementDiv.style.border = computedStyle.border;
    measurementDiv.style.boxSizing = computedStyle.boxSizing;
    measurementDiv.style.wordWrap = 'break-word';
    measurementDiv.style.whiteSpace = 'pre-wrap';
    
    measurementDiv.innerHTML = editor.innerHTML || ' ';
    
    const naturalHeight = measurementDiv.offsetHeight;
    const lineHeightValue = computedStyle.lineHeight;
    const lineHeight = lineHeightValue === 'normal' 
      ? parseFloat(computedStyle.fontSize) * 1.3 
      : parseFloat(lineHeightValue) || parseFloat(computedStyle.fontSize) * 1.3 || 20;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 8;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 8;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
    
    const minHeight = lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
    const newHeight = Math.max(naturalHeight, minHeight);
    
    if (newHeight !== calculatedHeight) {
      setCalculatedHeight(newHeight);
    }
  };

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const sanitized = sanitizeCellRichText(editorRef.current.innerHTML);
      onUpdateValue(sanitized);
      updateFormatStates();
      calculateHeight();
    }
  }, [onUpdateValue, updateFormatStates]);

  // Handle selection changes
  const handleSelectionChange = useCallback(() => {
    if (isFocused) {
      updateFormatStates();
    }
  }, [updateFormatStates, isFocused]);

  // Set initial content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      calculateHeight();
    }
  }, [value]);

  // Recalculate height when editor width changes
  useEffect(() => {
    if (!editorRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(calculateHeight, 0);
    });
    
    resizeObserver.observe(editorRef.current);
    return () => resizeObserver.disconnect();
  }, [currentWidth]);

  // Add selection change listener
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  // Handle keyboard shortcuts and navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle formatting shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          applyFormat('bold');
          return;
        case 'i':
          e.preventDefault();
          applyFormat('italic');
          return;
        case 'u':
          e.preventDefault();
          applyFormat('underline');
          return;
      }
    }

    // Cmd+Enter for line break
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      document.execCommand('insertHTML', false, '<br>');
      handleInput();
      return;
    }
    
    // For Enter, arrow keys, and Tab - navigate to next/previous cell
    if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab') {
      onKeyDown(e, itemId, cellRefKey);
      return;
    }
  }, [applyFormat, handleInput, onKeyDown, itemId, cellRefKey]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      e.stopPropagation();
    } else {
      e.preventDefault();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocusChange?.(editorRef.current);
    const row = editorRef.current?.closest('tr');
    if (row) {
      row.setAttribute('draggable', 'false');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    onFocusChange?.(null);
    const row = editorRef.current?.closest('tr');
    if (row) {
      setTimeout(() => {
        row.setAttribute('draggable', 'true');
      }, 50);
    }
  };

  const cellKey = `${itemId}-${cellRefKey}`;
  const resolvedFieldKey = fieldKeyForProtection ?? cellRefKey;
  const isHeaderRow = itemId.includes('header');
  const fontSize = 'text-sm';
  const fontWeight = isHeaderRow && cellRefKey === 'segmentName' ? 'font-medium' : '';

  return (
    <div className="relative w-full" style={{ backgroundColor, height: calculatedHeight }}>
      {/* Hidden measurement div */}
      <div
        ref={measurementRef}
        className="absolute top-0 left-0 opacity-0 pointer-events-none whitespace-pre-wrap break-words"
        style={{ 
          fontSize: '14px',
          fontFamily: 'inherit',
          lineHeight: '1.3',
          zIndex: -1
        }}
      />
      
      {/* Display overlay when not focused */}
      {!isFocused && (
        <div
          className={`absolute top-0 left-0 w-full h-full px-3 py-2 ${fontSize} ${fontWeight} whitespace-pre-wrap pointer-events-none z-10`}
          style={{ 
            color: textColor || 'inherit',
            lineHeight: '1.3'
          }}
        >
          {isHtmlContent(value) ? (
            <div dangerouslySetInnerHTML={{ __html: sanitizeCellRichText(value) }} />
          ) : (
            renderRichTextWithBrackets(value, { showNullAsText: true })
          )}
        </div>
      )}
      
      <div
        ref={(el) => {
          editorRef.current = el;
          if (el) {
            (cellRefs.current as any)[cellKey] = el;
          } else {
            delete cellRefs.current[cellKey];
          }
        }}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={onCellClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-cell-id={cellKey}
        data-cell-ref={cellKey}
        data-field-key={`${itemId}-${resolvedFieldKey}`}
        className={`w-full h-full px-3 py-2 ${fontSize} ${fontWeight} whitespace-pre-wrap border-0 focus:outline-none rounded-sm overflow-hidden ${
          !isFocused ? 'text-transparent caret-transparent' : ''
        }`}
        style={{ 
          backgroundColor: 'transparent',
          color: isFocused ? (textColor || 'inherit') : 'transparent',
          height: `${calculatedHeight}px`,
          lineHeight: '1.3',
          wordWrap: 'break-word'
        }}
        suppressContentEditableWarning={true}
      />
    </div>
  );
};

export default RichTextCell;
