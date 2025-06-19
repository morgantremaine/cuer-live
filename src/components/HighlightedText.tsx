
import React from 'react';

interface HighlightedTextProps {
  text: string;
  highlight?: {
    startIndex: number;
    endIndex: number;
  } | null;
  className?: string;
}

const HighlightedText = ({ text, highlight, className = '' }: HighlightedTextProps) => {
  if (!highlight || !text) {
    return <span className={className}>{text}</span>;
  }

  const { startIndex, endIndex } = highlight;
  
  // Ensure indices are valid
  if (startIndex < 0 || endIndex > text.length || startIndex >= endIndex) {
    return <span className={className}>{text}</span>;
  }

  const beforeMatch = text.slice(0, startIndex);
  const match = text.slice(startIndex, endIndex);
  const afterMatch = text.slice(endIndex);

  return (
    <span className={className}>
      {beforeMatch}
      <span className="bg-yellow-200 dark:bg-yellow-600 px-1 rounded">
        {match}
      </span>
      {afterMatch}
    </span>
  );
};

export default HighlightedText;
