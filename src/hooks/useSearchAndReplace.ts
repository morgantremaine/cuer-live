
import { useState, useCallback, useMemo } from 'react';
import { RundownItem } from '@/hooks/useRundownItems';

export interface SearchMatch {
  itemId: string;
  field: string;
  position: number;
  length: number;
}

export const useSearchAndReplace = (
  items: RundownItem[],
  onUpdateItem: (id: string, field: string, value: string) => void
) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);

  // Find all matches in the rundown
  const matches = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const results: SearchMatch[] = [];
    const searchText = isCaseSensitive ? searchTerm : searchTerm.toLowerCase();

    items.forEach((item) => {
      // Search in all text fields
      const fieldsToSearch = ['title', 'notes', 'script', 'talent', 'type'];
      
      fieldsToSearch.forEach((field) => {
        const fieldValue = item[field as keyof RundownItem] as string;
        if (typeof fieldValue === 'string' && fieldValue) {
          const textToSearch = isCaseSensitive ? fieldValue : fieldValue.toLowerCase();
          let startIndex = 0;
          
          while (startIndex < textToSearch.length) {
            const index = textToSearch.indexOf(searchText, startIndex);
            if (index === -1) break;
            
            results.push({
              itemId: item.id,
              field,
              position: index,
              length: searchTerm.length
            });
            
            startIndex = index + 1;
          }
        }
      });
    });

    return results;
  }, [items, searchTerm, isCaseSensitive]);

  const currentMatch = matches[currentMatchIndex] || null;

  const goToNextMatch = useCallback(() => {
    if (matches.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
    }
  }, [matches.length]);

  const goToPreviousMatch = useCallback(() => {
    if (matches.length > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
    }
  }, [matches.length]);

  const replaceCurrentMatch = useCallback(() => {
    if (!currentMatch || !replaceTerm) return;

    const item = items.find(i => i.id === currentMatch.itemId);
    if (!item) return;

    const fieldValue = item[currentMatch.field as keyof RundownItem] as string;
    const newValue = 
      fieldValue.substring(0, currentMatch.position) +
      replaceTerm +
      fieldValue.substring(currentMatch.position + currentMatch.length);

    onUpdateItem(currentMatch.itemId, currentMatch.field, newValue);
    
    // Move to next match after replacement
    goToNextMatch();
  }, [currentMatch, replaceTerm, items, onUpdateItem, goToNextMatch]);

  const replaceAllMatches = useCallback(() => {
    if (!searchTerm || !replaceTerm) return;

    const processedItems = new Set<string>();
    
    matches.forEach((match) => {
      const itemKey = `${match.itemId}-${match.field}`;
      if (processedItems.has(itemKey)) return;
      
      const item = items.find(i => i.id === match.itemId);
      if (!item) return;

      const fieldValue = item[match.field as keyof RundownItem] as string;
      const searchRegex = new RegExp(
        searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        isCaseSensitive ? 'g' : 'gi'
      );
      const newValue = fieldValue.replace(searchRegex, replaceTerm);

      onUpdateItem(match.itemId, match.field, newValue);
      processedItems.add(itemKey);
    });

    setSearchTerm('');
    setReplaceTerm('');
    setCurrentMatchIndex(0);
  }, [matches, searchTerm, replaceTerm, items, onUpdateItem, isCaseSensitive]);

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
    matches,
    currentMatch,
    currentMatchIndex,
    isReplaceMode,
    setIsReplaceMode,
    isCaseSensitive,
    setIsCaseSensitive,
    goToNextMatch,
    goToPreviousMatch,
    replaceCurrentMatch,
    replaceAllMatches,
    clearSearch
  };
};
