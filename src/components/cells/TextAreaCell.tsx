import React, { useState, useRef, useEffect } from 'react';
import HighlightedText from '../search/HighlightedText';
import { SearchState, SearchMatch } from '@/hooks/useRundownSearch';

interface TextAreaCellProps {
  value: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  backgroundColor?: string;
  isDuration?: boolean;
  searchState?: SearchState;
  currentMatch?: SearchMatch | null;
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
  searchState,
  currentMatch,
  onUpdateValue,
  onCellClick,
  onKeyDown
}: TextAreaCellProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const [calculatedHeight, setCalculatedHeight] = useState<number>(38);
  const [isEditing, setIsEditing] = useState(false);
  
  // Function to calculate the height of the textarea based on content
  const calculateTextHeight = (text: string) => {
    if (measurementRef.current) {
      measurementRef.current.textContent = text + '\n'; // Add a newline to ensure proper height calculation
      return measurementRef.current.offsetHeight;
    }
    return 38; // Default height
  };

  // Update calculatedHeight when value changes
  useEffect(() => {
    const newHeight = calculateTextHeight(value);
    setCalculatedHeight(newHeight);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    onKeyDown(e, itemId, cellRefKey);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  // Create the proper cell ref key
  const cellKey = `${itemId}-${cellRefKey}`;

  // Check if this is a header row based on itemId
  const isHeaderRow = itemId.includes('header');
  const fontSize = 'text-sm';
  const fontWeight = isHeaderRow && cellRefKey === 'segmentName' ? 'font-medium' : '';

  // Determine if we should show highlighted text or editable textarea
  const showHighlighted = !isEditing && searchState && searchState.query.trim().length > 0;

  return (
    <div className="relative w-full" style={{ backgroundColor, height: calculatedHeight }}>
      {/* Hidden measurement div */}
      <div
        ref={measurementRef}
        className="absolute top-0 left-0 opacity-0 pointer-events-none whitespace-pre-wrap break-words"
        style={{ 
          fontSize: '14px',
          fontFamily: 'inherit',
          lineHeight: '1.3',
          zIndex: -1
        }}
      />
      
      {showHighlighted ? (
        // Show highlighted text when not editing and search is active
        <div
          className={`w-full h-full px-3 py-2 ${fontSize} ${fontWeight} cursor-text ${
            isDuration ? 'font-mono' : ''
          }`}
          style={{ 
            color: textColor || 'inherit',
            height: `${calculatedHeight}px`,
            lineHeight: '1.3',
            textAlign: isDuration ? 'center' : 'left',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
          onClick={() => {
            setIsEditing(true);
            setTimeout(() => {
              textareaRef.current?.focus();
            }, 0);
          }}
        >
          <HighlightedText
            text={value}
            matches={searchState.matches}
            currentMatch={currentMatch}
            itemId={itemId}
            columnKey={cellRefKey}
          />
        </div>
      ) : (
        // Show editable textarea
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
      )}
    </div>
  );
};

export default TextAreaCell;
