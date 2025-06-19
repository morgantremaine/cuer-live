
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
    console.log('🔍 Performing search for:', text);
    
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
        if (!cellValue) return;
        
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

    console.log('🔍 Found matches:', foundMatches.length);
    setMatches(foundMatches);
    
    // Auto-select first match if we have matches
    if (foundMatches.length > 0) {
      setCurrentMatchIndex(0);
      const firstMatch = foundMatches[0];
      console.log('🎯 Highlighting first match:', firstMatch);
      onHighlightMatch(firstMatch.itemId, firstMatch.field, firstMatch.index, firstMatch.index + firstMatch.length);
    } else {
      setCurrentMatchIndex(-1);
      onHighlightMatch('', '', 0, 0);
    }
  };

  const updateCurrentMatch = (newIndex: number) => {
    console.log('🎯 Updating current match to index:', newIndex);
    setCurrentMatchIndex(newIndex);
    if (newIndex >= 0 && newIndex < matches.length) {
      const match = matches[newIndex];
      console.log('🎯 Highlighting match:', match);
      onHighlightMatch(match.itemId, match.field, match.index, match.index + match.length);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchText);
    }, 100); // Small delay to debounce search

    return () => clearTimeout(timeoutId);
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
