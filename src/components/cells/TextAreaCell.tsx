import React, { useEffect, useRef, useState } from 'react';
import { renderTextWithClickableUrls, containsUrls } from '@/utils/urlUtils';
import { renderScriptWithBrackets } from '@/utils/scriptUtils';
import { useDebouncedInput } from '@/hooks/useDebouncedInput';

interface TextAreaCellProps {
  value: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  backgroundColor?: string;
  isDuration?: boolean;
  renderBrackets?: boolean; // Enable bracket/color rendering like script column
  onUpdateValue: (value: string) => void;
  onCellClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  fieldKeyForProtection?: string; // ensures focus-based protection matches merge keys
  onCellFocus?: (itemId: string, field: string) => void;
  onCellBlur?: (itemId: string, field: string) => void;
}

const TextAreaCell = ({
  value,
  itemId,
  cellRefKey,
  cellRefs,
  textColor,
  backgroundColor,
  isDuration = false,
  renderBrackets = false,
  onUpdateValue,
  onCellClick,
  onKeyDown,
  fieldKeyForProtection,
  onCellFocus,
  onCellBlur
}: TextAreaCellProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const [calculatedHeight, setCalculatedHeight] = useState<number>(38);
  const [currentWidth, setCurrentWidth] = useState<number>(0);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const lastHeartbeatRef = useRef<number>(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  // Debounced input handling - immediate UI updates, batched parent updates
  const debouncedValue = useDebouncedInput(
    value,
    (newValue) => onUpdateValue(newValue),
    150
  );
  
  // Cleanup heartbeat interval on unmount
  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  // Helper to strip bracket formatting for height measurement
  const stripBracketFormatting = (text: string): string => {
    // Replace [content]{color} or [content] with just content plus spacing
    return text.replace(/\[([^\[\]{}]+)(?:\{[^}]+\})?\]/g, ' $1 ').trim();
  };

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
    
    // Set the content - strip brackets if renderBrackets is enabled AND not focused
    // When focused, user sees raw text so we need to measure the raw text
    const textToMeasure = (renderBrackets && !isFocused)
      ? stripBracketFormatting(debouncedValue.value)
      : debouncedValue.value;
    measurementDiv.textContent = textToMeasure || ' '; // Use space for empty content
    
    // Get the natural height
    const naturalHeight = measurementDiv.offsetHeight;
    
    // Calculate minimum height (single line) with better line-height fallback
    const lineHeightValue = computedStyle.lineHeight;
    const lineHeight = lineHeightValue === 'normal' 
      ? parseFloat(computedStyle.fontSize) * 1.3 
      : parseFloat(lineHeightValue) || parseFloat(computedStyle.fontSize) * 1.3 || 20;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
    
    const minHeight = lineHeight + borderTop + borderBottom;
    
    // Use the larger of natural height or minimum height
    const newHeight = Math.max(naturalHeight, minHeight);
    
    // Always update height if it's different (removed the conservative condition)
    if (newHeight !== calculatedHeight) {
      setCalculatedHeight(newHeight);
    }
  };

  // Debounced height recalculation - only recalculate after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateHeight();
    }, 100); // 100ms debounce for height recalculation
    return () => clearTimeout(timer);
  }, [debouncedValue.value, isFocused]);

  // Recalculate height when textarea width changes (column resize)
  useEffect(() => {
    if (!textareaRef.current) return;
    
    let resizeTimer: NodeJS.Timeout;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        if (newWidth !== currentWidth && Math.abs(newWidth - currentWidth) > 1) {
          // Debounce resize events too
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            calculateHeight();
          }, 50);
        }
      }
    });
    
    resizeObserver.observe(textareaRef.current);
    
    return () => {
      clearTimeout(resizeTimer);
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
      
      // Update the value using debounced handler
      debouncedValue.onChange(newValue);
      
      // Immediately recalculate height after line break insertion
      setTimeout(() => {
        calculateHeight();
      }, 0);
      
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
    debouncedValue.onChange(e.target.value, e.target as HTMLTextAreaElement);
    
    // Send typing heartbeat (throttled to every 3 seconds)
    const now = Date.now();
    if (onCellFocus && now - lastHeartbeatRef.current > 3000) {
      onCellFocus(itemId, cellRefKey);
      lastHeartbeatRef.current = now;
    }
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
    
    // Notify parent about focus (for broadcast to other users)
    if (onCellFocus) {
      onCellFocus(itemId, cellRefKey);
      lastHeartbeatRef.current = Date.now();
    }
    
    // Start heartbeat interval to keep indicator alive while focused
    heartbeatIntervalRef.current = setInterval(() => {
      if (onCellFocus) {
        onCellFocus(itemId, cellRefKey);
      }
    }, 5000); // Send heartbeat every 5 seconds while focused
  };

  // Enhanced blur handler to re-enable row dragging
  const handleBlur = (e: React.FocusEvent) => {
    // Force immediate update to parent on blur to ensure data is saved
    debouncedValue.forceUpdate();
    
    setIsFocused(false);
    
    // Clear heartbeat interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
    
    // Re-enable dragging when not editing
    const row = e.target.closest('tr');
    if (row) {
      // Use a small delay to avoid conflicts with other mouse events
      setTimeout(() => {
        row.setAttribute('draggable', 'true');
      }, 50);
    }
    
    // Notify parent about blur (for broadcast to other users)
    if (onCellBlur) {
      onCellBlur(itemId, cellRefKey);
    }
  };

// Create the proper cell ref key
const cellKey = `${itemId}-${cellRefKey}`;
// Resolve field key used for protection (matches merge keys)
const resolvedFieldKey = fieldKeyForProtection ?? ((cellRefKey === 'segmentName' || cellRefKey === 'name') ? 'name' : cellRefKey);
  const isHeaderRow = itemId.includes('header');
  const fontSize = isHeaderRow ? 'text-sm' : 'text-sm';
  const fontWeight = isHeaderRow && cellRefKey === 'segmentName' ? 'font-medium' : '';
  
  // Check if text contains bracket formatting
  const containsBrackets = (text: string): boolean => {
    return /\[[^\[\]{}]+(?:\{[^}]+\})?\]/.test(text);
  };
  
  // Check if this cell contains URLs and should show clickable links when not focused
  const shouldShowClickableUrls = !isFocused && containsUrls(debouncedValue.value);
  
  // Check if this cell should show bracket rendering when not focused
  const shouldShowBrackets = !isFocused && renderBrackets && containsBrackets(debouncedValue.value);
  
  // Determine if we should show any overlay
  const showOverlay = shouldShowClickableUrls || shouldShowBrackets;

  return (
    <div className="relative w-full flex items-center" style={{ backgroundColor }}>
      <div className="relative w-full h-auto">
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
            className={`absolute top-0 left-0 w-full h-full px-3 ${fontSize} ${fontWeight} whitespace-pre-wrap pointer-events-none z-10 flex items-center`}
            style={{ 
              color: textColor || 'inherit',
              lineHeight: '1.3',
              textAlign: isDuration ? 'center' : 'left'
            }}
          >
            {renderTextWithClickableUrls(debouncedValue.value)}
          </div>
        )}
        
        {/* Bracket-styled overlay when not focused */}
        {shouldShowBrackets && (
          <div
            className={`absolute inset-0 px-3 ${fontSize} ${fontWeight} flex flex-wrap items-center gap-0.5 pointer-events-none z-10`}
            style={{ 
              color: textColor || 'inherit',
              lineHeight: '1.3',
              textAlign: isDuration ? 'center' : 'left'
            }}
          >
            {renderScriptWithBrackets(debouncedValue.value, { 
              inlineDisplay: true, 
              fontSize: 14,
              showNullAsText: true 
            })}
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
          value={debouncedValue.value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={(e) => {
            onCellClick(e);
            // Also trigger focus broadcast on click
            if (onCellFocus) {
              onCellFocus(itemId, cellRefKey);
            }
          }}
          onMouseDown={handleMouseDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          data-cell-id={cellKey}
          data-cell-ref={cellKey}
          data-field-key={`${itemId}-${resolvedFieldKey}`}
          className={`w-full px-3 py-1 ${fontSize} ${fontWeight} whitespace-pre-wrap border-0 focus:border-0 focus:outline-none rounded-sm resize-none overflow-hidden ${
            isDuration ? 'font-mono' : ''
          } ${showOverlay ? 'text-transparent caret-transparent selection:bg-transparent' : ''}`}
          style={{ 
            backgroundColor: 'transparent',
            color: showOverlay ? 'transparent' : (textColor || 'inherit'),
            height: `${calculatedHeight}px`,
            lineHeight: '1.3',
            textAlign: isDuration ? 'center' : 'left'
          }}
        />
      </div>
    </div>
  );
};

export default TextAreaCell;
