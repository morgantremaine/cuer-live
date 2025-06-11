
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import HighlightedText from './HighlightedText';

interface ExpandableScriptCellProps {
  value: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  currentHighlight?: {
    startIndex: number;
    endIndex: number;
  } | null;
  onUpdateValue: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
}

const ExpandableScriptCell = ({
  value,
  itemId,
  cellRefKey,
  cellRefs,
  textColor,
  currentHighlight,
  onUpdateValue,
  onKeyDown
}: ExpandableScriptCellProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      
      if (isExpanded) {
        // Set minimum height of 120px when expanded, but allow it to grow
        textarea.style.height = Math.max(scrollHeight, 120) + 'px';
      } else {
        // When collapsed, keep it at single line height (24px) regardless of content
        textarea.style.height = '24px';
      }
    }
  }, [value, isExpanded]);

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

  // Helper function to check if cursor can move up/down within the textarea using browser APIs
  const canNavigateWithinText = (textarea: HTMLTextAreaElement, direction: 'up' | 'down') => {
    const currentPosition = textarea.selectionStart;
    
    // Create a temporary selection to test if the cursor can move in the desired direction
    const testPosition = currentPosition;
    
    // Save current selection
    const originalStart = textarea.selectionStart;
    const originalEnd = textarea.selectionEnd;
    
    // Set cursor to test position
    textarea.setSelectionRange(testPosition, testPosition);
    
    // Try to move the cursor using the browser's native navigation
    const keyEvent = new KeyboardEvent('keydown', {
      key: direction === 'up' ? 'ArrowUp' : 'ArrowDown',
      bubbles: true,
      cancelable: true
    });
    
    // Temporarily disable our event handler to let the browser handle it
    let newPosition = currentPosition;
    
    // Use a more reliable method: check if we're at visual boundaries
    if (direction === 'up') {
      // For up navigation, check if we're at the visual top
      // We can do this by temporarily moving up and seeing if position changes
      textarea.selectionStart = currentPosition;
      textarea.selectionEnd = currentPosition;
      
      // Simulate what would happen if we pressed arrow up
      const rect = textarea.getBoundingClientRect();
      const style = window.getComputedStyle(textarea);
      const lineHeight = parseInt(style.lineHeight) || 20;
      
      // Check if cursor is in the first visual line by checking if there's room to go up
      const textBeforeSelection = value.substring(0, currentPosition);
      const dummyDiv = document.createElement('div');
      dummyDiv.style.cssText = window.getComputedStyle(textarea).cssText;
      dummyDiv.style.position = 'absolute';
      dummyDiv.style.visibility = 'hidden';
      dummyDiv.style.height = 'auto';
      dummyDiv.style.width = textarea.clientWidth + 'px';
      dummyDiv.textContent = textBeforeSelection;
      document.body.appendChild(dummyDiv);
      
      const currentLineCount = Math.ceil(dummyDiv.scrollHeight / lineHeight);
      document.body.removeChild(dummyDiv);
      
      // If we're in the first line (approximately), we can't go up
      return currentLineCount > 1;
    } else {
      // For down navigation, check if we're at the visual bottom
      const textAfterSelection = value.substring(currentPosition);
      const dummyDiv = document.createElement('div');
      dummyDiv.style.cssText = window.getComputedStyle(textarea).cssText;
      dummyDiv.style.position = 'absolute';
      dummyDiv.style.visibility = 'hidden';
      dummyDiv.style.height = 'auto';
      dummyDiv.style.width = textarea.clientWidth + 'px';
      dummyDiv.textContent = textAfterSelection;
      document.body.appendChild(dummyDiv);
      
      const remainingHeight = dummyDiv.scrollHeight;
      document.body.removeChild(dummyDiv);
      
      // If there's significant content below, we can navigate down
      return remainingHeight > 20; // threshold for a line
    }
  };

  // Improved key navigation for script cells
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // For Up/Down arrows, check if we can still navigate within the text
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const textarea = e.target as HTMLTextAreaElement;
      
      // Use a simpler approach: check cursor position relative to text boundaries
      const currentPosition = textarea.selectionStart;
      
      if (e.key === 'ArrowUp') {
        // Check if we're at the very beginning or if there's nowhere to go up visually
        const lines = value.substring(0, currentPosition).split('\n');
        const currentLine = lines[lines.length - 1];
        const isFirstLine = lines.length === 1;
        
        if (isFirstLine && currentPosition <= currentLine.length) {
          // We're in the first line, allow navigation to previous cell
          onKeyDown(e, itemId, cellRefKey);
          return;
        }
      } else if (e.key === 'ArrowDown') {
        // Check if we're at the very end or if there's nowhere to go down visually
        const textAfterCursor = value.substring(currentPosition);
        const remainingLines = textAfterCursor.split('\n');
        const isLastLine = remainingLines.length === 1 && !textAfterCursor.includes('\n');
        
        if (isLastLine) {
          // We're in the last line, allow navigation to next cell
          onKeyDown(e, itemId, cellRefKey);
          return;
        }
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
    <div className="flex items-start space-x-2 w-full">
      <button
        onClick={toggleExpanded}
        className="flex-shrink-0 mt-1 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
        title={isExpanded ? 'Collapse' : 'Expand'}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      <div className="flex-1 relative">
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
              
              if (isExpanded) {
                e.target.style.height = Math.max(scrollHeight, 120) + 'px';
              } else {
                // Keep collapsed height at 24px regardless of content
                e.target.style.height = '24px';
              }
            }
          }}
          onKeyDown={handleKeyDown}
          data-cell-id={cellKey}
          data-cell-ref={cellKey}
          className={`w-full border-none bg-transparent ${focusStyles} focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-2 py-1 text-sm resize-none`}
          style={{ 
            color: textColor || undefined,
            minHeight: isExpanded ? '120px' : '24px',
            height: isExpanded ? 'auto' : '24px',
            overflow: isExpanded ? 'hidden' : 'hidden',
            whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
            wordWrap: isExpanded ? 'break-word' : 'normal',
            textOverflow: isExpanded ? 'unset' : 'ellipsis'
          }}
        />
        {currentHighlight && (
          <div className="absolute inset-0 pointer-events-none px-2 py-1 text-sm" style={{ color: 'transparent' }}>
            <HighlightedText text={value} highlight={currentHighlight} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandableScriptCell;
