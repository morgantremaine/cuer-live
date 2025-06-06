
import { useState, useEffect } from 'react';
import { SearchMatch } from '@/types/search';

export const useSearch = (
  items: any[], 
  visibleColumns: any[]
) => {
  const [searchText, setSearchText] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [currentHighlight, setCurrentHighlight] = useState<{
    itemId: string;
    field: string;
    startIndex: number;
    endIndex: number;
  } | null>(null);

  const highlightMatch = (itemId: string, field: string, startIndex: number, endIndex: number) => {
    if (itemId && field) {
      setCurrentHighlight({ itemId, field, startIndex, endIndex });
    } else {
      setCurrentHighlight(null);
    }
  };

  const replaceText = (itemId: string, field: string, searchText: string, replaceText: string, replaceAll: boolean) => {
    // This would be implemented by the parent component
    console.log('Replace text functionality would be handled by parent');
  };

  const performSearch = (text: string) => {
    if (!text.trim()) {
      setMatches([]);
      setCurrentMatchIndex(-1);
      setCurrentHighlight(null);
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
      if (currentMatchIndex === -1 || currentMatchIndex >= foundMatches.length) {
        setCurrentMatchIndex(0);
        const firstMatch = foundMatches[0];
        highlightMatch(firstMatch.itemId, firstMatch.field, firstMatch.index, firstMatch.index + firstMatch.length);
      } else {
        const currentMatch = foundMatches[currentMatchIndex];
        if (currentMatch) {
          highlightMatch(currentMatch.itemId, currentMatch.field, currentMatch.index, currentMatch.index + currentMatch.length);
        }
      }
    } else {
      setCurrentMatchIndex(-1);
      setCurrentHighlight(null);
    }
  };

  const updateCurrentMatch = (newIndex: number) => {
    setCurrentMatchIndex(newIndex);
    if (newIndex >= 0 && newIndex < matches.length) {
      const match = matches[newIndex];
      highlightMatch(match.itemId, match.field, match.index, match.index + match.length);
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
    performSearch,
    highlightMatch,
    replaceText,
    currentHighlight
  };
};
