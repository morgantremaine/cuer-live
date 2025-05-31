
import { useState, useEffect } from 'react';
import { SearchMatch } from '@/types/search';

export const useSearch = (
  items: any[], 
  visibleColumns: any[], 
  onHighlightMatch: (itemId: string, field: string, startIndex: number, endIndex: number) => void
) => {
  const [searchText, setSearchText] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const performSearch = (text: string) => {
    if (!text.trim()) {
      setMatches([]);
      setCurrentMatchIndex(-1);
      // Clear any existing highlights
      onHighlightMatch('', '', 0, 0);
      return;
    }

    const foundMatches: SearchMatch[] = [];
    const searchLower = text.toLowerCase();

    items.forEach((item) => {
      if (item.type === 'header') return;

      visibleColumns.forEach((column) => {
        const cellValue = item[column.id] || '';
        const cellValueLower = cellValue.toLowerCase();
        let index = 0;

        while (index < cellValue.length) {
          const foundIndex = cellValueLower.indexOf(searchLower, index);
          if (foundIndex === -1) break;

          foundMatches.push({
            itemId: item.id,
            field: column.id,
            index: foundIndex,
            length: text.length
          });

          index = foundIndex + 1;
        }
      });
    });

    setMatches(foundMatches);
    if (foundMatches.length > 0) {
      setCurrentMatchIndex(0);
      const firstMatch = foundMatches[0];
      onHighlightMatch(firstMatch.itemId, firstMatch.field, firstMatch.index, firstMatch.index + firstMatch.length);
    } else {
      setCurrentMatchIndex(-1);
      onHighlightMatch('', '', 0, 0);
    }
  };

  const updateCurrentMatch = (newIndex: number) => {
    setCurrentMatchIndex(newIndex);
    if (newIndex >= 0 && newIndex < matches.length) {
      const match = matches[newIndex];
      onHighlightMatch(match.itemId, match.field, match.index, match.index + match.length);
    }
  };

  useEffect(() => {
    performSearch(searchText);
  }, [searchText, items]);

  return {
    searchText,
    setSearchText,
    matches,
    currentMatchIndex,
    setCurrentMatchIndex: updateCurrentMatch,
    performSearch
  };
};
