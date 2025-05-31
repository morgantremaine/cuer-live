
import { useState, useCallback, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface SearchMatch {
  itemId: string;
  field: string;
  position: number;
  length: number;
  text: string;
}

export const useSearchAndReplace = (
  items: RundownItem[],
  visibleColumns: Column[],
  onUpdateItem: (id: string, field: string, value: string) => void
) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [showReplaceOptions, setShowReplaceOptions] = useState(false);

  // Get the value from a cell
  const getCellValue = useCallback((item: RundownItem, column: Column): string => {
    if (column.isCustom) {
      return item.customFields?.[column.key] || '';
    }
    return (item as any)[column.key] || '';
  }, []);

  // Find all matches across all visible cells
  const matches = useMemo((): SearchMatch[] => {
    if (!searchTerm.trim()) return [];

    const allMatches: SearchMatch[] = [];
    const searchText = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    items.forEach(item => {
      visibleColumns.forEach(column => {
        const cellValue = getCellValue(item, column);
        const searchableText = caseSensitive ? cellValue : cellValue.toLowerCase();
        
        let startIndex = 0;
        while (true) {
          const index = searchableText.indexOf(searchText, startIndex);
          if (index === -1) break;
          
          allMatches.push({
            itemId: item.id,
            field: column.key,
            position: index,
            length: searchTerm.length,
            text: cellValue.substring(index, index + searchTerm.length)
          });
          
          startIndex = index + 1;
        }
      });
    });

    return allMatches;
  }, [searchTerm, items, visibleColumns, caseSensitive, getCellValue]);

  // Navigate to next match
  const nextMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  // Navigate to previous match
  const previousMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  // Replace current match
  const replaceCurrent = useCallback(() => {
    if (matches.length === 0 || !replaceTerm) return;
    
    const currentMatch = matches[currentMatchIndex];
    const item = items.find(i => i.id === currentMatch.itemId);
    if (!item) return;

    const column = visibleColumns.find(c => c.key === currentMatch.field);
    if (!column) return;

    const currentValue = getCellValue(item, column);
    const before = currentValue.substring(0, currentMatch.position);
    const after = currentValue.substring(currentMatch.position + currentMatch.length);
    const newValue = before + replaceTerm + after;

    const updateField = column.isCustom ? `customFields.${column.key}` : column.key;
    onUpdateItem(currentMatch.itemId, updateField, newValue);
  }, [matches, currentMatchIndex, replaceTerm, items, visibleColumns, getCellValue, onUpdateItem]);

  // Replace all matches
  const replaceAll = useCallback(() => {
    if (matches.length === 0 || !replaceTerm) return;

    // Group matches by item and field to handle multiple matches in the same cell
    const groupedMatches = matches.reduce((acc, match) => {
      const key = `${match.itemId}-${match.field}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(match);
      return acc;
    }, {} as Record<string, SearchMatch[]>);

    Object.values(groupedMatches).forEach(cellMatches => {
      const firstMatch = cellMatches[0];
      const item = items.find(i => i.id === firstMatch.itemId);
      if (!item) return;

      const column = visibleColumns.find(c => c.key === firstMatch.field);
      if (!column) return;

      let currentValue = getCellValue(item, column);
      const searchText = caseSensitive ? searchTerm : searchTerm.toLowerCase();
      const valueToSearch = caseSensitive ? currentValue : currentValue.toLowerCase();
      
      // Replace all instances in this cell
      let newValue = '';
      let lastIndex = 0;
      
      while (true) {
        const index = valueToSearch.indexOf(searchText, lastIndex);
        if (index === -1) {
          newValue += currentValue.substring(lastIndex);
          break;
        }
        
        newValue += currentValue.substring(lastIndex, index) + replaceTerm;
        lastIndex = index + searchTerm.length;
      }

      const updateField = column.isCustom ? `customFields.${column.key}` : column.key;
      onUpdateItem(firstMatch.itemId, updateField, newValue);
    });
  }, [matches, replaceTerm, searchTerm, caseSensitive, items, visibleColumns, getCellValue, onUpdateItem]);

  // Get current match info
  const currentMatch = matches.length > 0 ? matches[currentMatchIndex] : null;

  // Reset current match index when search term changes
  const handleSearchTermChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentMatchIndex(0);
    setIsSearchActive(term.trim().length > 0);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setReplaceTerm('');
    setCurrentMatchIndex(0);
    setIsSearchActive(false);
    setShowReplaceOptions(false);
  }, []);

  return {
    searchTerm,
    replaceTerm,
    setReplaceTerm,
    currentMatchIndex,
    isSearchActive,
    caseSensitive,
    setCaseSensitive,
    showReplaceOptions,
    setShowReplaceOptions,
    matches,
    currentMatch,
    handleSearchTermChange,
    nextMatch,
    previousMatch,
    replaceCurrent,
    replaceAll,
    clearSearch
  };
};
