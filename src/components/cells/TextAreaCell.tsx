
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
  const [calculatedHeight, setCalculatedHeight] = useState<number>(38);

  // Function to calculate required height based on content and wrapping
  const calculateHeight = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    
    // Store original styles
    const originalHeight = textarea.style.height;
    const originalOverflow = textarea.style.overflow;
    
    // Reset to get natural height with current width
    textarea.style.height = 'auto';
    textarea.style.overflow = 'hidden';
    
    // Get the scroll height which accounts for text wrapping
    const scrollHeight = textarea.scrollHeight;
    
    // Restore original styles
    textarea.style.height = originalHeight;
    textarea.style.overflow = originalOverflow;
    
    // Calculate minimum single line height from computed styles
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 8;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 8;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
    
    const minHeight = lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
    
    // Use the larger of scroll height (which accounts for wrapping) or minimum height
    const newHeight = Math.max(scrollHeight, minHeight);
    setCalculatedHeight(newHeight);
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
    
    const resizeObserver = new ResizeObserver(() => {
      const timer = setTimeout(() => {
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
