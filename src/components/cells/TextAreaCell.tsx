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
  const [cellHeight, setCellHeight] = useState<number>(34); // Minimum cell height with padding
  const [contentHeight, setContentHeight] = useState<number>(20); // Just the text content height
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

  // Function to calculate required height using native textarea scrollHeight
  const calculateHeightWithText = (textToMeasure: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const computedStyle = window.getComputedStyle(textarea);
    
    // Calculate line height and padding
    const lineHeightValue = computedStyle.lineHeight;
    const fontSize = parseFloat(computedStyle.fontSize) || 14;
    const lineHeight = lineHeightValue === 'normal' 
      ? fontSize * 1.3 
      : parseFloat(lineHeightValue) || fontSize * 1.3 || 20;
    const basePadding = 8; // py-2 = 8px
    const minCellHeight = lineHeight + basePadding * 2;
    const singleLineContentHeight = lineHeight; // Just the text, no padding
    
    // Temporarily set the value and height to measure accurately
    const originalValue = textarea.value;
    const originalHeight = textarea.style.height;
    
    // Set the text we want to measure
    textarea.value = textToMeasure;
    textarea.style.height = 'auto';
    
    // Get the natural scrollHeight (includes textarea's internal padding)
    const naturalScrollHeight = textarea.scrollHeight;
    // Estimate pure content height (subtract padding that textarea adds)
    const pureContentHeight = naturalScrollHeight - basePadding * 2;
    
    // Restore original values
    textarea.value = originalValue;
    textarea.style.height = originalHeight;
    
    // Cell height is the larger of natural scroll height or minimum
    const newCellHeight = Math.max(naturalScrollHeight, minCellHeight);
    // Content height is just the text (for single line, use lineHeight; for multi-line, use calculated)
    const newContentHeight = Math.max(pureContentHeight, singleLineContentHeight);
    
    if (newCellHeight !== cellHeight) {
      setCellHeight(newCellHeight);
    }
    if (newContentHeight !== contentHeight) {
      setContentHeight(newContentHeight);
    }
  };

  // Backward-compatible wrapper
  const calculateHeight = () => {
    calculateHeightWithText(debouncedValue.value);
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
    
    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize events
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        calculateHeight();
      }, 50);
    });
    
    resizeObserver.observe(textareaRef.current);
    
    return () => {
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
    };
  }, []);

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
      
      // Immediately recalculate height with the NEW value (not debounced)
      setTimeout(() => {
        calculateHeightWithText(newValue);
        // Set cursor position after the inserted line break
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
    const newValue = e.target.value;
    debouncedValue.onChange(newValue, e.target as HTMLTextAreaElement);
    
    // Immediately recalculate height for responsive shrinking/expanding
    calculateHeightWithText(newValue);
    
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
  
  // Standard padding - height is handled by minHeight on container
  const basePadding = 8; // py-2 = 8px

  return (
    <div 
      className="relative w-full flex items-center" 
      style={{ backgroundColor, minHeight: cellHeight }}
    >
      
      {/* Clickable URL overlay when not focused - positioned to allow editing */}
      {shouldShowClickableUrls && (
        <div
          className={`absolute inset-0 flex items-center px-3 ${fontSize} ${fontWeight} whitespace-pre-wrap pointer-events-none z-10`}
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
          className={`absolute inset-0 flex items-center px-3 ${fontSize} ${fontWeight} flex-wrap gap-0.5 pointer-events-none z-10`}
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
        className={`w-full px-3 ${fontSize} ${fontWeight} whitespace-pre-wrap border-0 focus:border-0 focus:outline-none rounded-sm resize-none overflow-hidden ${
          isDuration ? 'font-mono' : ''
        } ${showOverlay ? 'text-transparent caret-transparent selection:bg-transparent' : ''}`}
        style={{ 
          backgroundColor: 'transparent',
          color: showOverlay ? 'transparent' : (textColor || 'inherit'),
          height: `${contentHeight}px`,
          lineHeight: '1.3',
          textAlign: isDuration ? 'center' : 'left'
        }}
      />
    </div>
  );
};

export default TextAreaCell;
