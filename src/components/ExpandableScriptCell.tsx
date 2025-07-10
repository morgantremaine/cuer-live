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
  const [isEditing, setIsEditing] = useState(false);
  
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

  // Handle clicking to enter edit mode
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection when clicking to edit
    if (effectiveExpanded && !isEditing) {
      setIsEditing(true);
      // Focus the textarea after a brief delay to ensure it's ready
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  // Handle blur to exit edit mode
  const handleBlur = () => {
    setIsEditing(false);
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.max(scrollHeight, 24) + 'px';
    }
  }, [value, isEditing]);

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
    
    // For other navigation keys, use the provided handler
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab') {
      // Let these work normally in the textarea
      return;
    }
  };

  // Create the proper cell ref key
  const cellKey = `${itemId}-${cellRefKey}`;

  return (
    <div className="flex items-start space-x-1 w-full expandable-script-cell">
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
      <div className="flex-1 relative">
        {/* Textarea for editing - only visible when in edit mode */}
        {isEditing && (
          <textarea
            ref={(el) => {
              if (el) {
                cellRefs.current[cellKey] = el;
                textareaRef.current = el;
              } else {
                delete cellRefs.current[cellKey];
              }
            }}
            value={value}
            onChange={(e) => {
              onUpdateValue(e.target.value);
              // Trigger resize on content change
              if (e.target) {
                e.target.style.height = 'auto';
                const scrollHeight = e.target.scrollHeight;
                e.target.style.height = Math.max(scrollHeight, 24) + 'px';
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            onDrag={(e) => e.preventDefault()}
            onDragEnd={(e) => e.preventDefault()}
            data-cell-id={cellKey}
            data-cell-ref={cellKey}
            className={`w-full border-none bg-transparent ${focusStyles} focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-1 py-1 text-sm resize-none`}
            style={{ 
              color: textColor || undefined,
              minHeight: '24px',
              height: 'auto',
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}
          />
        )}

        {/* Expanded view mode - shows rendered script with brackets */}
        {effectiveExpanded && !isEditing && (
          <div
            onClick={handleClick}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            className="w-full cursor-text rounded px-1 py-1 text-sm min-h-[24px]"
            style={{ 
              color: textColor || undefined,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}
          >
            {value ? (
              isNullScript(value) ? (
                <span className="text-gray-600 dark:text-gray-300 font-mono">
                  [null]
                </span>
              ) : (
                renderScriptWithBrackets(value, { 
                  inlineDisplay: false, 
                  fontSize: 14 
                })
              )
            ) : (
              <span className="text-gray-400">
                {fieldType === 'notes' ? 'Click to add notes...' : 'Click to add script...'}
              </span>
            )}
          </div>
        )}

        {/* Invisible textarea for collapsed state to maintain ref */}
        {!effectiveExpanded && (
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
            disabled
            readOnly
            className="w-full border-none bg-transparent text-transparent cursor-pointer rounded px-1 py-1 text-sm resize-none"
            style={{ 
              minHeight: '24px',
              height: '24px',
              overflow: 'hidden'
            }}
          />
        )}
        {!effectiveExpanded && value && !isNullScript(value) && (
          <div 
            className="absolute inset-0 flex items-center justify-start pointer-events-none"
            style={{ 
              height: '100%',
              overflow: 'hidden',
              padding: '4px'
            }}
          >
            <div className="truncate w-full text-sm" style={{ color: textColor || undefined }}>
              {renderScriptWithBrackets(value, { 
                inlineDisplay: true, 
                fontSize: 14 
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandableScriptCell;
