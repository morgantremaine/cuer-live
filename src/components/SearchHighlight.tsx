
import React from 'react';

interface SearchHighlightProps {
  text: string;
  searchTerm: string;
  caseSensitive?: boolean;
  className?: string;
}

export const SearchHighlight = ({ 
  text, 
  searchTerm, 
  caseSensitive = false,
  className = '' 
}: SearchHighlightProps) => {
  if (!searchTerm || !text) {
    return <span className={className}>{text}</span>;
  }

  const searchValue = caseSensitive ? searchTerm : searchTerm.toLowerCase();
  const textValue = caseSensitive ? text : text.toLowerCase();
  
  const parts: Array<{ text: string; isMatch: boolean }> = [];
  let lastIndex = 0;
  
  let searchIndex = textValue.indexOf(searchValue);
  while (searchIndex !== -1) {
    // Add text before match
    if (searchIndex > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, searchIndex),
        isMatch: false
      });
    }
    
    // Add match
    parts.push({
      text: text.substring(searchIndex, searchIndex + searchTerm.length),
      isMatch: true
    });
    
    lastIndex = searchIndex + searchTerm.length;
    searchIndex = textValue.indexOf(searchValue, lastIndex);
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      isMatch: false
    });
  }

  return (
    <span className={className}>
      {parts.map((part, index) => (
        part.isMatch ? (
          <mark 
            key={index} 
            className="bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      ))}
    </span>
  );
};
