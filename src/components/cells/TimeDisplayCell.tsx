
import React from 'react';
import HighlightedText from './HighlightedText';
import { SearchMatch } from '@/hooks/useRundownSearch';

interface TimeDisplayCellProps {
  value: string;
  backgroundColor?: string;
  textColor?: string;
  searchMatches?: SearchMatch[];
  currentSearchMatch?: SearchMatch | null;
}

const TimeDisplayCell = ({ 
  value, 
  backgroundColor, 
  textColor, 
  searchMatches = [],
  currentSearchMatch
}: TimeDisplayCellProps) => {
  const displayValue = value || '00:00:00';
  
  // Convert SearchMatch to HighlightMatch format
  const highlightMatches = searchMatches.map(match => ({
    startIndex: match.startIndex,
    endIndex: match.endIndex
  }));
  
  const currentHighlightMatch = currentSearchMatch ? {
    startIndex: currentSearchMatch.startIndex,
    endIndex: currentSearchMatch.endIndex
  } : undefined;

  return (
    <div className="w-full h-full p-1" style={{ backgroundColor }}>
      <span 
        className="inline-block w-full text-sm font-mono px-1 py-1 rounded-sm text-center border-0"
        style={{ color: textColor || 'inherit' }}
      >
        <HighlightedText
          text={displayValue}
          matches={highlightMatches}
          currentMatch={currentHighlightMatch}
        />
      </span>
    </div>
  );
};

export default TimeDisplayCell;
