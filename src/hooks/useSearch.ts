
import { useState, useEffect } from 'react';
import { SearchMatch } from '@/types/search';
import { getCellValue } from '@/utils/sharedRundownUtils';

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
    const searchLower = text.toLowerCase().trim();

    items.forEach((item) => {
      if (item.type === 'header') return;

      visibleColumns.forEach((column) => {
        // Get the actual cell value using the shared utility
        const cellValue = getCellValue(item, column);
        const cellValueLower = cellValue.toLowerCase();
        
        // Use indexOf for exact phrase matching
        let searchIndex = 0;
        while (searchIndex < cellValue.length) {
          const foundIndex = cellValueLower.indexOf(searchLower, searchIndex);
          if (foundIndex === -1) break;

          foundMatches.push({
            itemId: item.id,
            field: column.key,
            index: foundIndex,
            length: text.trim().length
          });

          searchIndex = foundIndex + 1;
        }
      });
    });

    setMatches(foundMatches);
    
    // Only update current match index if we have matches and no current match is set
    if (foundMatches.length > 0) {
      // If we don't have a current match or the current index is invalid, set to first match
      if (currentMatchIndex === -1 || currentMatchIndex >= foundMatches.length) {
        setCurrentMatchIndex(0);
        const firstMatch = foundMatches[0];
        onHighlightMatch(firstMatch.itemId, firstMatch.field, firstMatch.index, firstMatch.index + firstMatch.length);
      } else {
        // Keep the current match if it's still valid
        const currentMatch = foundMatches[currentMatchIndex];
        if (currentMatch) {
          onHighlightMatch(currentMatch.itemId, currentMatch.field, currentMatch.index, currentMatch.index + currentMatch.length);
        }
      }
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
