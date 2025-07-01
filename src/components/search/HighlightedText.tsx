
import React from 'react';
import { SearchMatch } from '@/hooks/useRundownSearch';

interface HighlightedTextProps {
  text: string;
  matches: SearchMatch[];
  currentMatch: SearchMatch | null;
  itemId: string;
  columnKey: string;
}

const HighlightedText = ({ 
  text, 
  matches, 
  currentMatch, 
  itemId, 
  columnKey 
}: HighlightedTextProps) => {
  // Filter matches for this specific cell
  const cellMatches = matches.filter(
    match => match.itemId === itemId && match.columnKey === columnKey
  );

  // If no matches, return plain text
  if (cellMatches.length === 0) {
    return <span>{text}</span>;
  }

  // Sort matches by start index to process them in order
  const sortedMatches = [...cellMatches].sort((a, b) => a.startIndex - b.startIndex);

  // Build highlighted text segments
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedMatches.forEach((match, index) => {
    // Add text before this match
    if (match.startIndex > lastIndex) {
      segments.push(
        <span key={`text-${index}`}>
          {text.substring(lastIndex, match.startIndex)}
        </span>
      );
    }

    // Add highlighted match
    const isCurrentMatch = currentMatch && 
      currentMatch.itemId === match.itemId && 
      currentMatch.columnKey === match.columnKey &&
      currentMatch.startIndex === match.startIndex;

    segments.push(
      <span
        key={`match-${index}`}
        className={`${
          isCurrentMatch 
            ? 'bg-yellow-400 text-black font-medium' 
            : 'bg-yellow-200 text-black'
        }`}
        style={{
          padding: '1px 2px',
          borderRadius: '2px',
        }}
      >
        {text.substring(match.startIndex, match.endIndex)}
      </span>
    );

    lastIndex = match.endIndex;
  });

  // Add remaining text after last match
  if (lastIndex < text.length) {
    segments.push(
      <span key="text-end">
        {text.substring(lastIndex)}
      </span>
    );
  }

  return <span>{segments}</span>;
};

export default HighlightedText;
