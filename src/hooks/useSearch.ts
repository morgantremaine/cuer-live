
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSearchingRef = useRef(false);

  const performSearch = useCallback((text: string) => {
    // Prevent multiple simultaneous searches
    if (isSearchingRef.current) {
      console.log('⚠️ Search already in progress, skipping');
      return;
    }

    isSearchingRef.current = true;
    console.log('🔍 Performing search for:', text);
    
    if (!text.trim()) {
      setMatches([]);
      setCurrentMatchIndex(-1);
      onHighlightMatch('', '', 0, 0);
      isSearchingRef.current = false;
      return;
    }

    const foundMatches: SearchMatch[] = [];
    const searchLower = text.toLowerCase().trim();

    items.forEach((item) => {
      if (item.type === 'header') return;

      visibleColumns.forEach((column) => {
        const cellValue = getCellValue(item, column);
        if (!cellValue || typeof cellValue !== 'string') return;
        
        const cellValueLower = cellValue.toLowerCase();
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
    
    if (foundMatches.length > 0) {
      setCurrentMatchIndex(0);
      const firstMatch = foundMatches[0];
      console.log('🎯 Highlighting first match:', firstMatch);
      onHighlightMatch(firstMatch.itemId, firstMatch.field, firstMatch.index, firstMatch.index + firstMatch.length);
    } else {
      setCurrentMatchIndex(-1);
      onHighlightMatch('', '', 0, 0);
    }

    isSearchingRef.current = false;
  }, [items, visibleColumns, onHighlightMatch]);

  const updateCurrentMatch = useCallback((newIndex: number) => {
    console.log('🎯 Updating current match to index:', newIndex);
    setCurrentMatchIndex(newIndex);
    if (newIndex >= 0 && newIndex < matches.length) {
      const match = matches[newIndex];
      console.log('🎯 Highlighting match:', match);
      onHighlightMatch(match.itemId, match.field, match.index, match.index + match.length);
    }
  }, [matches, onHighlightMatch]);

  const refreshSearch = useCallback(() => {
    if (searchText.trim() && !isSearchingRef.current) {
      performSearch(searchText);
    }
  }, [searchText, performSearch]);

  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the search
    searchTimeoutRef.current = setTimeout(() => {
      if (!isSearchingRef.current) {
        performSearch(searchText);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, performSearch]);

  return {
    searchText,
    setSearchText,
    matches,
    currentMatchIndex,
    setCurrentMatchIndex: updateCurrentMatch,
    performSearch,
    refreshSearch
  };
};
