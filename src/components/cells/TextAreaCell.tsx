
import React, { useEffect, useRef, useState } from 'react';
import HighlightedText from '../HighlightedText';

interface TextAreaCellProps {
  value: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  backgroundColor?: string;
  isDuration?: boolean;
  highlight?: {
    startIndex: number;
    endIndex: number;
  } | null;
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
  highlight,
  onUpdateValue,
  onCellClick,
  onKeyDown
}: TextAreaCellProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [calculatedHeight, setCalculatedHeight] = useState<number>(38); // Start with a more reasonable default

  // Function to calculate required height based on content
  const calculateHeight = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    
    // Store original styles
    const originalHeight = textarea.style.height;
    const originalOverflow = textarea.style.overflow;
    
    // Reset to get natural height
    textarea.style.height = 'auto';
    textarea.style.overflow = 'hidden';
    
    // Get the scroll height
    const scrollHeight = textarea.scrollHeight;
    
    // Restore original styles
    textarea.style.height = originalHeight;
    textarea.style.overflow = originalOverflow;
    
    // For empty content or single line, use a more conservative height
    if (!value.trim() || !value.includes('\n')) {
      // Calculate single line height from computed styles
      const computedStyle = window.getComputedStyle(textarea);
      const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 8;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 8;
      const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
      const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
      
      const singleLineHeight = lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
      
      // Use the smaller of scroll height or calculated single line height
      const newHeight = Math.min(scrollHeight, singleLineHeight);
      setCalculatedHeight(newHeight);
    } else {
      // For multi-line content, use scroll height
      setCalculatedHeight(scrollHeight);
    }
  };

  // Recalculate height when value changes
  useEffect(() => {
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      calculateHeight();
    }, 0);
  }, [value]);

  // Recalculate height when textarea resizes (column width changes)
  useEffect(() => {
    if (!textareaRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        calculateHeight();
      }, 0);
    });
    
    resizeObserver.observe(textareaRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Simple key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // For Enter key and arrow keys, navigate to next/previous cell
    if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      onKeyDown(e, itemId, cellRefKey);
      return;
    }
    
    // Allow other keys to work normally
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateValue(e.target.value);
    // Height will be recalculated by useEffect
  };

  // Create the proper cell ref key
  const cellKey = `${itemId}-${cellRefKey}`;

  // Check if this is a header row based on itemId
  const isHeaderRow = itemId.includes('header');
  const fontSize = isHeaderRow ? 'text-sm' : 'text-sm';
  const fontWeight = isHeaderRow && cellRefKey === 'segmentName' ? 'font-medium' : '';

  return (
    <div className="relative w-full" style={{ backgroundColor, height: calculatedHeight }}>
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
        data-cell-id={cellKey}
        data-cell-ref={cellKey}
        className={`w-full h-full px-3 py-2 ${fontSize} ${fontWeight} border-0 focus:border-0 focus:outline-none rounded-sm resize-none overflow-hidden ${
          isDuration ? 'font-mono text-center' : ''
        }`}
        style={{ 
          backgroundColor: 'transparent',
          color: textColor || 'inherit',
          height: `${calculatedHeight}px`,
          lineHeight: '1.3'
        }}
      />
      {highlight && (
        <div className="absolute inset-0 pointer-events-none px-3 py-2 text-sm flex items-center" style={{ color: 'transparent' }}>
          <HighlightedText text={value} highlight={highlight} />
        </div>
      )}
    </div>
  );
};

export default TextAreaCell;
