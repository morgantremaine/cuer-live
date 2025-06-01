
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
        // When collapsed, allow multiple lines but with reasonable height
        const minHeight = value.includes('\n') ? 48 : 24; // 2 lines if has line breaks, 1 line otherwise
        textarea.style.height = Math.max(Math.min(scrollHeight, 72), minHeight) + 'px'; // Max 3 lines when collapsed
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

  // Handle key down events, but allow Enter for line breaks
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Enter key to create new lines
    if (e.key === 'Enter') {
      // Don't prevent default - let the textarea handle it naturally
      return;
    }
    
    // For other keys, use the provided handler
    onKeyDown(e, itemId, cellRefKey);
  };

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
              cellRefs.current[`${itemId}-${cellRefKey}`] = el;
              textareaRef.current = el;
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
                const minHeight = e.target.value.includes('\n') ? 48 : 24;
                e.target.style.height = Math.max(Math.min(scrollHeight, 72), minHeight) + 'px';
              }
            }
          }}
          onKeyDown={handleKeyDown}
          className={`w-full border-none bg-transparent ${focusStyles} focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-2 py-1 text-sm resize-none`}
          style={{ 
            color: textColor || undefined,
            minHeight: isExpanded ? '120px' : '24px',
            height: 'auto',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}
          placeholder="Enter script content..."
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
