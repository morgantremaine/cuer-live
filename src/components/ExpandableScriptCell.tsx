import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { renderScriptWithBrackets, isNullScript } from '@/utils/scriptUtils';

interface ExpandableScriptCellProps {
  value: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  columnExpanded?: boolean;
  fieldType?: 'script' | 'notes';
  onUpdateValue: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
}

const ExpandableScriptCell = ({
  value,
  itemId,
  cellRefKey,
  cellRefs,
  textColor,
  columnExpanded = false,
  fieldType = 'script',
  onUpdateValue,
  onKeyDown
}: ExpandableScriptCellProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Sync with column expanded state changes but maintain local control
  useEffect(() => {
    if (columnExpanded !== undefined) {
      setIsExpanded(columnExpanded);
    }
  }, [columnExpanded]);
  
  // Always use local state - column state just sets it initially
  const effectiveExpanded = isExpanded;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Always allow local toggle
    setIsExpanded(!isExpanded);
  };

  // Handle clicking to focus the textarea (no separate edit mode)
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection when clicking to edit
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.max(scrollHeight, 24) + 'px';
    }
  }, [value]);

  // Get the appropriate focus styles for colored rows in dark mode
  const getFocusStyles = () => {
    // Check if textColor is set (indicating a colored row)
    const hasCustomColor = textColor && textColor !== '';
    
    if (hasCustomColor) {
      // For colored rows, force white text on focus in dark mode and black in light mode
      return 'focus:bg-white dark:focus:bg-gray-800 focus:!text-gray-900 dark:focus:!text-white';
    } else {
      // For normal rows, use standard focus styles
      return 'focus:bg-white dark:focus:bg-gray-700';
    }
  };

  const focusStyles = getFocusStyles();

  // Helper function to check if cursor is at visual line boundaries
  const isAtVisualBoundary = (textarea: HTMLTextAreaElement, direction: 'up' | 'down'): boolean => {
    const cursorPosition = textarea.selectionStart;
    const textValue = textarea.value;
    
    // Save current selection
    const originalStart = textarea.selectionStart;
    const originalEnd = textarea.selectionEnd;
    
    // Create a temporary div to measure text layout
    const measureDiv = document.createElement('div');
    measureDiv.style.cssText = window.getComputedStyle(textarea).cssText;
    measureDiv.style.position = 'absolute';
    measureDiv.style.visibility = 'hidden';
    measureDiv.style.height = 'auto';
    measureDiv.style.width = textarea.clientWidth + 'px';
    measureDiv.style.whiteSpace = 'pre-wrap';
    measureDiv.style.wordWrap = 'break-word';
    measureDiv.style.overflow = 'hidden';
    document.body.appendChild(measureDiv);
    
    try {
      // Get the line height
      const computedStyle = window.getComputedStyle(textarea);
      const lineHeight = parseInt(computedStyle.lineHeight) || parseInt(computedStyle.fontSize) * 1.2;
      
      if (direction === 'up') {
        // Check if cursor is in the first visual line
        const textBeforeCursor = textValue.substring(0, cursorPosition);
        measureDiv.textContent = textBeforeCursor;
        const heightBeforeCursor = measureDiv.scrollHeight;
        const linesBeforeCursor = Math.floor(heightBeforeCursor / lineHeight);
        
        // If we're in the first line (0-indexed), we're at the top boundary
        return linesBeforeCursor === 0;
      } else {
        // Check if cursor is in the last visual line
        const textAfterCursor = textValue.substring(cursorPosition);
        measureDiv.textContent = textAfterCursor;
        const heightAfterCursor = measureDiv.scrollHeight;
        
        // If there's minimal content after cursor (less than one line), we're at bottom
        return heightAfterCursor <= lineHeight;
      }
    } finally {
      document.body.removeChild(measureDiv);
      // Restore original selection
      textarea.setSelectionRange(originalStart, originalEnd);
    }
  };

  // Enhanced key navigation for script cells with proper visual line detection
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // For Up/Down arrows, check if we can still navigate within the text
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const textarea = e.target as HTMLTextAreaElement;
      
      // Check if we're at a visual boundary (first/last line)
      const atBoundary = isAtVisualBoundary(textarea, e.key === 'ArrowUp' ? 'up' : 'down');
      
      if (atBoundary) {
        // We're at a visual boundary, allow navigation to previous/next cell
        onKeyDown(e, itemId, cellRefKey);
        return;
      }
      
      // Otherwise, let the textarea handle the arrow key naturally (navigate within text)
      return;
    }
    
    // For Enter key, always allow it to create new lines (don't call onKeyDown)
    if (e.key === 'Enter') {
      return;
    }
    
    // For Tab key, allow standard navigation
    if (e.key === 'Tab') {
      onKeyDown(e, itemId, cellRefKey);
      return;
    }
    
    // For other navigation keys, let textarea handle them
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      return;
    }
  };

  // Create the proper cell ref key
  const cellKey = `${itemId}-${cellRefKey}`;

  return (
    <div className="flex items-start space-x-1 w-full expandable-script-cell overflow-hidden">
      <button
        onClick={toggleExpanded}
        className="flex-shrink-0 mt-1 p-1 rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
        title={effectiveExpanded ? 'Collapse' : 'Expand'}
      >
        {effectiveExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      <div className="flex-1 relative min-w-0">
        {/* When expanded: show normal editable textarea */}
        {effectiveExpanded && (
          <textarea
            ref={(el) => {
              if (el) {
                cellRefs.current[cellKey] = el;
                textareaRef.current = el;
                // Auto-resize on mount
                requestAnimationFrame(() => {
                  if (el) {
                    el.style.height = 'auto';
                    const scrollHeight = el.scrollHeight;
                    el.style.height = Math.max(scrollHeight, 24) + 'px';
                  }
                });
              } else {
                delete cellRefs.current[cellKey];
              }
            }}
            value={value}
            onChange={(e) => {
              onUpdateValue(e.target.value);
              // Trigger resize on content change
              requestAnimationFrame(() => {
                if (e.target) {
                  e.target.style.height = 'auto';
                  const scrollHeight = e.target.scrollHeight;
                  e.target.style.height = Math.max(scrollHeight, 24) + 'px';
                }
              });
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            onDrag={(e) => e.preventDefault()}
            onDragEnd={(e) => e.preventDefault()}
            data-cell-id={cellKey}
            data-cell-ref={cellKey}
            placeholder={fieldType === 'notes' ? 'Add notes...' : 'Add script...'}
            className="w-full border-none bg-transparent focus:outline-none rounded px-1 py-1 text-sm resize-none overflow-hidden"
            style={{ 
              color: textColor || undefined,
              minHeight: '24px',
              height: 'auto',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}
          />
        )}

        {/* When collapsed: show read-only preview with teleprompter styling */}
        {!effectiveExpanded && (
          <>
            {/* Hidden textarea for ref management when collapsed */}
            <textarea
              ref={(el) => {
                if (el) {
                  cellRefs.current[cellKey] = el;
                } else {
                  delete cellRefs.current[cellKey];
                }
              }}
              value={value}
              data-cell-id={cellKey}
              data-cell-ref={cellKey}
              tabIndex={-1}
              readOnly
              className="sr-only"
              style={{ display: 'none' }}
            />
            {/* Visual preview with teleprompter styling */}
            <div 
              className="w-full px-1 py-1 text-sm flex items-start h-full"
              style={{ 
                color: textColor || undefined,
                minHeight: '24px'
              }}
            >
              {value && !isNullScript(value) ? (
                <div 
                  style={{ 
                    maxWidth: '100%',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    width: '100%',
                    lineHeight: '1.25rem',
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    height: '100%'
                  }}
                >
                  {renderScriptWithBrackets(value, { 
                    inlineDisplay: true, 
                    fontSize: 14 
                  })}
                </div>
              ) : (
                <span></span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExpandableScriptCell;
