
import React from 'react';

interface HighlightMatch {
  startIndex: number;
  endIndex: number;
}

interface HighlightedTextProps {
  text: string;
  matches: HighlightMatch[];
  currentMatch?: HighlightMatch;
  className?: string;
}

const HighlightedText = ({ text, matches, currentMatch, className }: HighlightedTextProps) => {
  if (matches.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Sort matches by start index
  const sortedMatches = [...matches].sort((a, b) => a.startIndex - b.startIndex);
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedMatches.forEach((match, index) => {
    // Add text before match
    if (match.startIndex > lastIndex) {
      parts.push(
        <span key={`text-${index}`}>
          {text.substring(lastIndex, match.startIndex)}
        </span>
      );
    }

    // Add highlighted match
    const isCurrentMatch = currentMatch && 
      match.startIndex === currentMatch.startIndex && 
      match.endIndex === currentMatch.endIndex;

    parts.push(
      <span
        key={`match-${index}`}
        className={`${
          isCurrentMatch 
            ? 'bg-blue-500 text-white' 
            : 'bg-yellow-200 dark:bg-yellow-600 text-black dark:text-white'
        } px-0.5 rounded-sm`}
      >
        {text.substring(match.startIndex, match.endIndex)}
      </span>
    );

    lastIndex = match.endIndex;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key="text-end">
        {text.substring(lastIndex)}
      </span>
    );
  }

  return <span className={className}>{parts}</span>;
};

export default HighlightedText;
