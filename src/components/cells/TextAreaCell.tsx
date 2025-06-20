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
    
    // Always update height to ensure proper resizing (both up and down)
    setCalculatedHeight(newHeight);
  };

  // Recalculate height when value changes - with immediate execution
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has updated
    const frame = requestAnimationFrame(() => {
      calculateHeight();
    });
    return () => cancelAnimationFrame(frame);
  }, [value]); // This will trigger every time value changes

  // Recalculate height when textarea width changes (column resize)
  useEffect(() => {
    if (!textareaRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        if (newWidth !== currentWidth && newWidth > 0) {
          // Use requestAnimationFrame to ensure proper timing
          requestAnimationFrame(() => {
            calculateHeight();
          });
        }
      }
    });
    
    resizeObserver.observe(textareaRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [currentWidth]);

  // Initial height calculation when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateHeight();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Enhanced key navigation that allows multi-line editing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const textValue = textarea.value;
    const lines = textValue.split('\n');
    
    // Find current line and position
    let currentLineIndex = 0;
    let charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (charCount + lines[i].length >= selectionStart) {
        currentLineIndex = i;
        break;
      }
      charCount += lines[i].length + 1; // +1 for newline
    }
    
    const currentLineStart = charCount;
    const currentLineEnd = charCount + lines[currentLineIndex].length;
    const positionInLine = selectionStart - currentLineStart;

    // Handle different key combinations
    if (e.key === 'Enter') {
      if (e.ctrlKey) {
        // Ctrl+Enter navigates to next cell
        e.preventDefault();
        onKeyDown(e, itemId, cellRefKey);
      }
      // Regular Enter creates a line break (default behavior)
      return;
    }
    
    if (e.key === 'ArrowUp') {
      if (e.ctrlKey) {
        // Ctrl+Up navigates to previous cell
        e.preventDefault();
        onKeyDown(e, itemId, cellRefKey);
      } else if (currentLineIndex === 0) {
        // At first line, navigate to previous cell
        e.preventDefault();
        onKeyDown(e, itemId, cellRefKey);
      }
      // Otherwise allow normal arrow navigation within text
      return;
    }
    
    if (e.key === 'ArrowDown') {
      if (e.ctrlKey) {
        // Ctrl+Down navigates to next cell
        e.preventDefault();
        onKeyDown(e, itemId, cellRefKey);
      } else if (currentLineIndex === lines.length - 1) {
        // At last line, navigate to next cell
        e.preventDefault();
        onKeyDown(e, itemId, cellRefKey);
      }
      // Otherwise allow normal arrow navigation within text
      return;
    }
    
    if (e.key === 'ArrowLeft') {
      if (selectionStart === 0 && selectionEnd === 0) {
        // At beginning of text, don't navigate (stay in current cell)
        e.preventDefault();
      }
      return;
    }
    
    if (e.key === 'ArrowRight') {
      if (selectionStart === textValue.length && selectionEnd === textValue.length) {
        // At end of text, don't navigate (stay in current cell)
        e.preventDefault();
      }
      return;
    }
    
    // Allow other keys to work normally
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateValue(e.target.value);
    // Height will be recalculated by useEffect watching value changes
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
