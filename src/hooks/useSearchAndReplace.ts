
import { useState, useCallback, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface SearchMatch {
  itemId: string;
  field: string;
  index: number;
  text: string;
}

export const useSearchAndReplace = (items: RundownItem[], visibleColumns: Column[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);

  // Find all matches in the rundown
  const matches = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const foundMatches: SearchMatch[] = [];
    const searchText = isCaseSensitive ? searchTerm : searchTerm.toLowerCase();

    items.forEach((item) => {
      visibleColumns.forEach((column) => {
        let value = '';
        if (column.isCustom) {
          value = item.customFields?.[column.key] || '';
        } else {
          value = (item as any)[column.key] || '';
        }

        const textToSearch = isCaseSensitive ? value : value.toLowerCase();
        let index = 0;
        
        while (index < textToSearch.length) {
          const foundIndex = textToSearch.indexOf(searchText, index);
          if (foundIndex === -1) break;
          
          foundMatches.push({
            itemId: item.id,
            field: column.key,
            index: foundIndex,
            text: value
          });
          
          index = foundIndex + 1;
        }
      });
    });

    return foundMatches;
  }, [searchTerm, items, visibleColumns, isCaseSensitive]);

  const totalMatches = matches.length;
  const currentMatch = matches[currentMatchIndex] || null;

  const nextMatch = useCallback(() => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % totalMatches);
    }
  }, [totalMatches]);

  const previousMatch = useCallback(() => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
    }
  }, [totalMatches]);

  const replaceCurrentMatch = useCallback((updateItem: (id: string, field: string, value: string) => void) => {
    if (!currentMatch || !replaceTerm) return;

    const { itemId, field, index, text } = currentMatch;
    const newText = text.substring(0, index) + replaceTerm + text.substring(index + searchTerm.length);
    
    const updateFieldKey = visibleColumns.find(col => col.key === field)?.isCustom 
      ? `customFields.${field}` 
      : field;
    
    updateItem(itemId, updateFieldKey, newText);
    
    // Move to next match after replacement
    if (totalMatches > 1) {
      nextMatch();
    }
  }, [currentMatch, replaceTerm, searchTerm, visibleColumns, nextMatch, totalMatches]);

  const replaceAllMatches = useCallback((updateItem: (id: string, field: string, value: string) => void) => {
    if (!searchTerm || !replaceTerm) return;

    // Group matches by item and field
    const groupedMatches = new Map<string, SearchMatch[]>();
    matches.forEach(match => {
      const key = `${match.itemId}-${match.field}`;
      if (!groupedMatches.has(key)) {
        groupedMatches.set(key, []);
      }
      groupedMatches.get(key)!.push(match);
    });

    // Replace all occurrences in each field
    groupedMatches.forEach(fieldMatches => {
      if (fieldMatches.length === 0) return;
      
      const { itemId, field, text } = fieldMatches[0];
      const searchRegex = new RegExp(
        searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 
        isCaseSensitive ? 'g' : 'gi'
      );
      const newText = text.replace(searchRegex, replaceTerm);
      
      const updateFieldKey = visibleColumns.find(col => col.key === field)?.isCustom 
        ? `customFields.${field}` 
        : field;
      
      updateItem(itemId, updateFieldKey, newText);
    });

    // Clear search after replace all
    setSearchTerm('');
    setReplaceTerm('');
    setCurrentMatchIndex(0);
  }, [matches, searchTerm, replaceTerm, isCaseSensitive, visibleColumns]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setReplaceTerm('');
    setCurrentMatchIndex(0);
    setIsReplaceMode(false);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    replaceTerm,
    setReplaceTerm,
    currentMatchIndex: currentMatchIndex + 1, // 1-based for display
    totalMatches,
    currentMatch,
    isReplaceMode,
    setIsReplaceMode,
    isCaseSensitive,
    setIsCaseSensitive,
    nextMatch,
    previousMatch,
    replaceCurrentMatch,
    replaceAllMatches,
    clearSearch
  };
};
