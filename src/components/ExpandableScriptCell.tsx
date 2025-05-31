
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ExpandableScriptCellProps {
  value: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  onUpdateValue: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
}

const ExpandableScriptCell = ({
  value,
  itemId,
  cellRefKey,
  cellRefs,
  textColor,
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
    if (textareaRef.current && isExpanded) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      // Set minimum height of 120px when expanded, but allow it to grow
      textarea.style.height = Math.max(scrollHeight, 120) + 'px';
    }
  }, [value, isExpanded]);

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
          if (isExpanded && e.target) {
            e.target.style.height = 'auto';
            e.target.style.height = Math.max(e.target.scrollHeight, 120) + 'px';
          }
        }}
        onKeyDown={(e) => onKeyDown(e, itemId, cellRefKey)}
        className="flex-1 border-none bg-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-2 py-1 text-sm resize-none"
        style={{ 
          color: textColor || undefined,
          minHeight: isExpanded ? '120px' : '24px',
          height: isExpanded ? 'auto' : '24px',
          overflow: isExpanded ? 'visible' : 'hidden',
          whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
          textOverflow: isExpanded ? 'unset' : 'ellipsis'
        }}
        rows={isExpanded ? undefined : 1}
        placeholder="Enter script content..."
      />
    </div>
  );
};

export default ExpandableScriptCell;
