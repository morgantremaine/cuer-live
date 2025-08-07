import React, { useEffect, useRef, useState } from 'react';

interface HyperlinkTextCellProps {
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

const HyperlinkTextCell = ({
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
}: HyperlinkTextCellProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [calculatedHeight, setCalculatedHeight] = useState<number>(38);
  const [currentWidth, setCurrentWidth] = useState<number>(0);

  // URL detection regex
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

  // Function to calculate required height using a measurement div
  const calculateHeight = () => {
    if (!measurementRef.current) return;
    
    const measurementDiv = measurementRef.current;
    const container = displayRef.current || textareaRef.current;
    if (!container) return;
    
    // Get the current width of the container
    const containerWidth = container.getBoundingClientRect().width;
    
    // Update current width
    setCurrentWidth(containerWidth);
    
    // Copy container styles to measurement div
    const computedStyle = window.getComputedStyle(container);
    measurementDiv.style.width = `${containerWidth}px`;
    measurementDiv.style.fontSize = computedStyle.fontSize;
    measurementDiv.style.fontFamily = computedStyle.fontFamily;
    measurementDiv.style.fontWeight = computedStyle.fontWeight;
    measurementDiv.style.lineHeight = computedStyle.lineHeight;
    measurementDiv.style.padding = computedStyle.padding;
    measurementDiv.style.border = computedStyle.border;
    measurementDiv.style.boxSizing = computedStyle.boxSizing;
    measurementDiv.style.wordWrap = 'break-word';
    measurementDiv.style.whiteSpace = 'pre-wrap';
    measurementDiv.style.wordBreak = 'break-word';
    measurementDiv.style.overflowWrap = 'anywhere';
    
    // For hyperlink mode, create a more accurate measurement by rendering similar content
    if (!isEditing && value && urlRegex.test(value)) {
      // Clear the measurement div first
      measurementDiv.innerHTML = '';
      
      // Split the text and create similar structure to the display
      const parts = value.split(urlRegex);
      parts.forEach((part) => {
        if (part.match(urlRegex)) {
          // Create a span that mimics the link styling for measurement
          const linkSpan = document.createElement('span');
          linkSpan.textContent = part;
          linkSpan.style.wordBreak = 'break-all';
          linkSpan.style.overflowWrap = 'anywhere';
          measurementDiv.appendChild(linkSpan);
        } else {
          // Create a text node for regular text
          const textNode = document.createTextNode(part);
          measurementDiv.appendChild(textNode);
        }
      });
    } else {
      // For editing mode or plain text, use simple text content
      measurementDiv.textContent = value || ' '; // Use space for empty content
    }
    
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
    
    // Always update height if it's different
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
  }, [value, isEditing]);

  // Recalculate height when container width changes (column resize)
  useEffect(() => {
    const container = displayRef.current || textareaRef.current;
    if (!container) return;
    
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
    
    resizeObserver.observe(container);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [currentWidth, isEditing]);

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
      setIsEditing(false);
      onKeyDown(e, itemId, cellRefKey);
      return;
    }
    
    // For Escape, exit editing mode
    if (e.key === 'Escape') {
      setIsEditing(false);
      return;
    }
    
    // Allow other keys to work normally
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateValue(e.target.value);
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
    // Find the parent row and disable dragging while editing
    const row = e.target.closest('tr');
    if (row) {
      row.setAttribute('draggable', 'false');
    }
  };

  // Enhanced blur handler to re-enable row dragging
  const handleBlur = (e: React.FocusEvent) => {
    setIsEditing(false);
    // Re-enable dragging when not editing
    const row = e.target.closest('tr');
    if (row) {
      // Use a small delay to avoid conflicts with other mouse events
      setTimeout(() => {
        row.setAttribute('draggable', 'true');
      }, 50);
    }
  };

  // Handle display div click to enter edit mode
  const handleDisplayClick = (e: React.MouseEvent) => {
    // Don't enter edit mode if clicking on a link
    if ((e.target as HTMLElement).tagName === 'A') {
      return;
    }
    
    // Calculate cursor position based on click coordinates
    const clickX = e.clientX;
    const clickY = e.clientY;
    const rect = displayRef.current?.getBoundingClientRect();
    
    setIsEditing(true);
    onCellClick(e);
    
    // Focus the textarea and set cursor position after it's rendered
    setTimeout(() => {
      if (textareaRef.current && rect) {
        textareaRef.current.focus();
        
        // Calculate relative click position
        const relativeX = clickX - rect.left;
        const relativeY = clickY - rect.top;
        
        // Use document.caretPositionFromPoint or document.caretRangeFromPoint to get text position
        let cursorPosition = 0;
        
        if ((document as any).caretPositionFromPoint) {
          const caretPos = (document as any).caretPositionFromPoint(clickX, clickY);
          if (caretPos && caretPos.offsetNode && caretPos.offsetNode.textContent) {
            // Find the position in the full text
            const clickedText = caretPos.offsetNode.textContent;
            const fullText = value;
            const textIndex = fullText.indexOf(clickedText);
            if (textIndex !== -1) {
              cursorPosition = textIndex + caretPos.offset;
            }
          }
        } else if ((document as any).caretRangeFromPoint) {
          const range = (document as any).caretRangeFromPoint(clickX, clickY);
          if (range && range.startContainer && range.startContainer.textContent) {
            const clickedText = range.startContainer.textContent;
            const fullText = value;
            const textIndex = fullText.indexOf(clickedText);
            if (textIndex !== -1) {
              cursorPosition = textIndex + range.startOffset;
            }
          }
        }
        
        // Ensure cursor position is within bounds
        cursorPosition = Math.max(0, Math.min(cursorPosition, value.length));
        
        // Set the cursor position
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  // Convert text with URLs to JSX with hyperlinks
  const renderTextWithLinks = (text: string) => {
    if (!text) return null;
    
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const url = part.startsWith('http') ? part : `https://${part}`;
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
            onClick={(e) => e.stopPropagation()}
            style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
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
      
      {isEditing ? (
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
          onMouseDown={handleMouseDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          data-cell-id={cellKey}
          data-cell-ref={cellKey}
          className={`w-full h-full px-3 py-2 ${fontSize} ${fontWeight} whitespace-pre-wrap border-0 focus:border-0 focus:outline-none rounded-sm resize-none overflow-hidden ${
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
      ) : (
        <div
          ref={(el) => {
            displayRef.current = el;
            if (el) {
              cellRefs.current[cellKey] = el as any; // Type assertion for ref compatibility
            } else {
              delete cellRefs.current[cellKey];
            }
          }}
          onClick={handleDisplayClick}
          onMouseDown={handleMouseDown}
          data-cell-id={cellKey}
          data-cell-ref={cellKey}
          className={`w-full h-full px-3 py-2 ${fontSize} ${fontWeight} whitespace-pre-wrap break-words cursor-text overflow-hidden ${
            isDuration ? 'font-mono' : ''
          }`}
          style={{ 
            backgroundColor: 'transparent',
            color: textColor || 'inherit',
            height: `${calculatedHeight}px`,
            lineHeight: '1.3',
            textAlign: isDuration ? 'center' : 'left'
          }}
        >
          {renderTextWithLinks(value)}
        </div>
      )}
    </div>
  );
};

export default HyperlinkTextCell;