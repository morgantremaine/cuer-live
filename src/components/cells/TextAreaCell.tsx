import React, { useEffect, useRef, useState } from 'react';

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
  onKeyDown
}: TextAreaCellProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const [calculatedHeight, setCalculatedHeight] = useState<number>(38);
  const [currentWidth, setCurrentWidth] = useState<number>(0);

  // Function to calculate required height using a measurement div
  const calculateHeight = () => {
    if (!textareaRef.current || !measurementRef.current) return;
    
    const textarea = textareaRef.current;
    const measurementDiv = measurementRef.current;
    
    // Get the current width of the textarea
    const textareaWidth = textarea.getBoundingClientRect().width;
    
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
    measurementDiv.style.wordWrap = 'break-word';
    measurementDiv.style.whiteSpace = 'pre-wrap';
    
    // Set the content
    measurementDiv.textContent = value || ' '; // Use space for empty content
    
    // Get the natural height
    const naturalHeight = measurementDiv.offsetHeight;
    
    // Calculate minimum height (single line)
    const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
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
    // Debug logging for Mac command key detection
    if (e.key === 'Enter') {
      console.log('Enter key pressed:', {
        key: e.key,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey
      });
    }
    
    // For Cmd+Enter (Mac) or Ctrl+Enter (Windows), allow line break (don't prevent default)
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      console.log('Command/Ctrl+Enter detected - allowing line break');
      // Allow the default behavior to insert a line break
      return;
    }
    
    // For Enter (without Cmd/Ctrl) and arrow keys, navigate to next/previous cell
    if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      console.log('Regular navigation key - calling onKeyDown');
      onKeyDown(e, itemId, cellRefKey);
      return;
    }
    
    // Allow other keys to work normally
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateValue(e.target.value);
    // Height will be recalculated by useEffect
  };

  // Enhanced mouse down handler to prevent row dragging when selecting text
  const handleMouseDown = (e: React.MouseEvent) => {
    // Stop propagation to prevent row drag events
    e.stopPropagation();
  };

  // Enhanced focus handler to disable row dragging when editing
  const handleFocus = (e: React.FocusEvent) => {
    // Find the parent row and disable dragging while editing
    const row = e.target.closest('tr');
    if (row) {
      row.setAttribute('draggable', 'false');
    }
  };

  // Enhanced blur handler to re-enable row dragging
  const handleBlur = (e: React.FocusEvent) => {
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

  // Check if this is a header row based on itemId
  const isHeaderRow = itemId.includes('header');
  const fontSize = isHeaderRow ? 'text-sm' : 'text-sm';
  const fontWeight = isHeaderRow && cellRefKey === 'segmentName' ? 'font-medium' : '';

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
        className={`w-full h-full px-3 py-2 ${fontSize} ${fontWeight} border-0 focus:border-0 focus:outline-none rounded-sm resize-none overflow-hidden ${
          isDuration ? 'font-mono' : ''
        }`}
        style={{ 
          backgroundColor: 'transparent',
          color: textColor || 'inherit',
          height: `${calculatedHeight}px`,
          lineHeight: '1.3',
          textAlign: isDuration ? 'center' : 'left'
        }}
      />
    </div>
  );
};

export default TextAreaCell;
