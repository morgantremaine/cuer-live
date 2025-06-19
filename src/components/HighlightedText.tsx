
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
    return <span className={className} style={{ color: 'transparent' }}>{text}</span>;
  }

  const { startIndex, endIndex } = highlight;
  
  // Ensure indices are valid
  if (startIndex < 0 || endIndex > text.length || startIndex >= endIndex) {
    return <span className={className} style={{ color: 'transparent' }}>{text}</span>;
  }

  const beforeMatch = text.slice(0, startIndex);
  const match = text.slice(startIndex, endIndex);
  const afterMatch = text.slice(endIndex);

  return (
    <span className={className} style={{ color: 'transparent' }}>
      {beforeMatch}
      <span 
        className="bg-yellow-300 dark:bg-yellow-600 text-black dark:text-white px-0.5 rounded-sm"
        style={{ color: 'inherit' }}
      >
        {match}
      </span>
      {afterMatch}
    </span>
  );
};

export default HighlightedText;
