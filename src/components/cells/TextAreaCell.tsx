import React, { useEffect, useRef, useState } from 'react';
import { renderTextWithClickableUrls, containsUrls } from '@/utils/urlUtils';

interface TextAreaCellProps {
  value: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  backgroundColor?: string;
  isDuration?: boolean;
  onUpdateValue: (value: string) => void;
  onCellClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  fieldKeyForProtection?: string; // ensures focus-based protection matches merge keys
}

const TextAreaCell = ({
  value,
  itemId,
  cellRefKey,
  cellRefs,
  textColor,
  backgroundColor,
  isDuration = false,
  onUpdateValue,
  onCellClick,
  onKeyDown,
  fieldKeyForProtection
}: TextAreaCellProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const [calculatedHeight, setCalculatedHeight] = useState<number>(38);
  const [currentWidth, setCurrentWidth] = useState<number>(0);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Function to calculate required height using a measurement div
  const calculateHeight = () => {
    if (!textareaRef.current || !measurementRef.current) return;
    
    const textarea = textareaRef.current;
    const measurementDiv = measurementRef.current;
    
    // Get the current width using zoom-safe clientWidth instead of getBoundingClientRect
    const textareaWidth = textarea.clientWidth;
    
    // Update current width
    setCurrentWidth(textareaWidth);
    
    // Copy textarea styles to measurement div
    const computedStyle = window.getComputedStyle(textarea);
    measurementDiv.style.width = `${textareaWidth}px`;
    measurementDiv.style.fontSize = computedStyle.fontSize;
    measurementDiv.style.fontFamily = computedStyle.fontFamily;
    measurementDiv.style.fontWeight = computedStyle.fontWeight;
    measurementDiv.style.lineHeight = computedStyle.lineHeight;
    measurementDiv.style.padding = computedStyle.padding;
    measurementDiv.style.border = computedStyle.border;
    measurementDiv.style.boxSizing = computedStyle.boxSizing;
    // Always allow normal text wrapping in the measurement div
    measurementDiv.style.wordWrap = 'break-word';
    measurementDiv.style.whiteSpace = 'pre-wrap';
    
    // Set the content
    measurementDiv.textContent = value || ' '; // Use space for empty content
    
    // Get the natural height
    const naturalHeight = measurementDiv.offsetHeight;
    
    // Calculate minimum height (single line) with better line-height fallback
    const lineHeightValue = computedStyle.lineHeight;
    const lineHeight = lineHeightValue === 'normal' 
      ? parseFloat(computedStyle.fontSize) * 1.3 
      : parseFloat(lineHeightValue) || parseFloat(computedStyle.fontSize) * 1.3 || 20;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 8;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 8;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
    
    const minHeight = lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
    
    // Use the larger of natural height or minimum height
    const newHeight = Math.max(naturalHeight, minHeight);
    
    // Always update height if it's different (removed the conservative condition)
    if (newHeight !== calculatedHeight) {
      setCalculatedHeight(newHeight);
    }
  };

  // Recalculate height when value changes
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateHeight();
    }, 0);
    return () => clearTimeout(timer);
  }, [value]);

  // Recalculate height when textarea width changes (column resize)
  useEffect(() => {
    if (!textareaRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        if (newWidth !== currentWidth) {
          const timer = setTimeout(() => {
            calculateHeight();
          }, 0);
        }
      }
    });
    
    resizeObserver.observe(textareaRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [currentWidth]);

  // Handle keyboard navigation and line breaks
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // For Cmd+Enter (Mac) or Ctrl+Enter (Windows), manually insert line break
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();
      
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = textarea.value;
      
      // Insert line break at cursor position
      const newValue = currentValue.substring(0, start) + '\n' + currentValue.substring(end);
      
      // Update the value
      onUpdateValue(newValue);
      
      // Set cursor position after the inserted line break
      setTimeout(() => {
        textarea.setSelectionRange(start + 1, start + 1);
      }, 0);
      
      return;
    }
    
    // For Enter (without Cmd/Ctrl), arrow keys, and Tab navigation, navigate to next/previous cell
    if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab') {
      onKeyDown(e, itemId, cellRefKey);
      return;
    }
    
    // Allow other keys to work normally
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log('📝 TextAreaCell handleChange - SINGLE CHAR TEST', { 
      value: e.target.value, 
      length: e.target.value.length,
      lastChar: e.target.value.slice(-1)
    });
    onUpdateValue(e.target.value);
    // Height will be recalculated by useEffect
  };

  // Enhanced mouse down handler to prevent row dragging when selecting text
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle left-clicks - right-clicks should not start editing or stop propagation
    if (e.button === 0) { // Left click
      // Stop propagation to prevent row drag events
      e.stopPropagation();
    } else {
      // For right-clicks, prevent focusing to avoid triggering edit mode
      e.preventDefault();
    }
  };

  // Enhanced focus handler to disable row dragging when editing
  const handleFocus = (e: React.FocusEvent) => {
    setIsFocused(true);
    // Find the parent row and disable dragging while editing
    const row = e.target.closest('tr');
    if (row) {
      row.setAttribute('draggable', 'false');
    }
  };

  // Enhanced blur handler to re-enable row dragging
  const handleBlur = (e: React.FocusEvent) => {
    setIsFocused(false);
    // Re-enable dragging when not editing
    const row = e.target.closest('tr');
    if (row) {
      // Use a small delay to avoid conflicts with other mouse events
      setTimeout(() => {
        row.setAttribute('draggable', 'true');
      }, 50);
    }
  };

// Create the proper cell ref key
const cellKey = `${itemId}-${cellRefKey}`;
// Resolve field key used for protection (matches merge keys)
const resolvedFieldKey = fieldKeyForProtection ?? ((cellRefKey === 'segmentName' || cellRefKey === 'name') ? 'name' : cellRefKey);
  const isHeaderRow = itemId.includes('header');
  const fontSize = isHeaderRow ? 'text-sm' : 'text-sm';
  const fontWeight = isHeaderRow && cellRefKey === 'segmentName' ? 'font-medium' : '';
  
  // Check if this cell contains URLs and should show clickable links when not focused
  const shouldShowClickableUrls = !isFocused && containsUrls(value);

  return (
    <div className="relative w-full" style={{ backgroundColor, height: calculatedHeight }}>
      {/* Hidden measurement div */}
      <div
        ref={measurementRef}
        className="absolute top-0 left-0 opacity-0 pointer-events-none whitespace-pre-wrap break-words"
        style={{ 
          fontSize: isHeaderRow ? '14px' : '14px',
          fontFamily: 'inherit',
          lineHeight: '1.3',
          zIndex: -1
        }}
      />
      
      {/* Clickable URL overlay when not focused - positioned to allow editing */}
      {shouldShowClickableUrls && (
        <div
          className={`absolute top-0 left-0 w-full h-full px-3 py-2 ${fontSize} ${fontWeight} whitespace-pre-wrap pointer-events-none z-10`}
          style={{ 
            color: textColor || 'inherit',
            lineHeight: '1.3',
            textAlign: isDuration ? 'center' : 'left'
          }}
        >
          {renderTextWithClickableUrls(value)}
        </div>
      )}
      
      <textarea
        ref={(el) => {
          textareaRef.current = el;
          if (el) {
            cellRefs.current[cellKey] = el;
          } else {
            delete cellRefs.current[cellKey];
          }
        }}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={onCellClick}
        onMouseDown={handleMouseDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-cell-id={cellKey}
        data-cell-ref={cellKey}
        data-field-key={`${itemId}-${resolvedFieldKey}`}
        className={`w-full h-full px-3 py-2 ${fontSize} ${fontWeight} whitespace-pre-wrap border-0 focus:border-0 focus:outline-none rounded-sm resize-none overflow-hidden ${
          isDuration ? 'font-mono' : ''
        } ${shouldShowClickableUrls ? 'text-transparent caret-transparent selection:bg-transparent' : ''}`}
        style={{ 
          backgroundColor: 'transparent',
          color: shouldShowClickableUrls ? 'transparent' : (textColor || 'inherit'),
          height: `${calculatedHeight}px`,
          lineHeight: '1.3',
          textAlign: isDuration ? 'center' : 'left'
        }}
      />
    </div>
  );
};

export default TextAreaCell;
