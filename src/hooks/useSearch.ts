
import { useState, useEffect } from 'react';
import { SearchMatch } from '@/types/search';

export const useSearch = (items: any[], visibleColumns: any[]) => {
  const [searchText, setSearchText] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const performSearch = (text: string) => {
    if (!text.trim()) {
      setMatches([]);
      setCurrentMatchIndex(-1);
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
    } else {
      setCurrentMatchIndex(-1);
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
    setCurrentMatchIndex,
    performSearch
  };
};
