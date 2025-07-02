
import { useState, useCallback, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';

interface FindReplaceMatch {
  itemId: string;
  field: string;
  index: number;
  length: number;
  text: string;
}

export const useRundownFindReplace = (
  items: RundownItem[],
  updateItem: (id: string, field: string, value: string) => void
) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Fields to search in
  const searchableFields = ['name', 'script', 'notes', 'talent', 'gfx', 'video', 'images'];

  // Find all matches
  const matches = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const allMatches: FindReplaceMatch[] = [];
    const searchText = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    items.forEach(item => {
      searchableFields.forEach(field => {
        const fieldValue = item[field as keyof RundownItem] as string;
        if (typeof fieldValue === 'string' && fieldValue) {
          const textToSearch = caseSensitive ? fieldValue : fieldValue.toLowerCase();
          let index = 0;
          
          while (index < textToSearch.length) {
            const foundIndex = textToSearch.indexOf(searchText, index);
            if (foundIndex === -1) break;
            
            allMatches.push({
              itemId: item.id,
              field,
              index: foundIndex,
              length: searchTerm.length,
              text: fieldValue.substring(foundIndex, foundIndex + searchTerm.length)
            });
            
            index = foundIndex + 1;
          }
        }
      });
    });

    return allMatches;
  }, [items, searchTerm, caseSensitive, searchableFields]);

  const totalMatches = matches.length;

  const goToMatch = useCallback((matchIndex: number) => {
    if (matches.length === 0) return;
    
    const validIndex = Math.max(0, Math.min(matchIndex, matches.length - 1));
    setCurrentMatchIndex(validIndex);
    
    const match = matches[validIndex];
    if (match) {
      // Focus on the cell containing this match
      const cellKey = `${match.itemId}-${match.field}`;
      const cellElement = document.querySelector(`[data-cell-key="${cellKey}"]`) as HTMLElement;
      
      if (cellElement) {
        cellElement.focus();
        cellElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [matches]);

  const goToNext = useCallback(() => {
    if (matches.length === 0) return;
    const nextIndex = currentMatchIndex >= matches.length - 1 ? 0 : currentMatchIndex + 1;
    goToMatch(nextIndex);
  }, [currentMatchIndex, matches.length, goToMatch]);

  const goToPrevious = useCallback(() => {
    if (matches.length === 0) return;
    const prevIndex = currentMatchIndex <= 0 ? matches.length - 1 : currentMatchIndex - 1;
    goToMatch(prevIndex);
  }, [currentMatchIndex, matches.length, goToMatch]);

  const replaceCurrent = useCallback(() => {
    if (matches.length === 0 || !replaceTerm) return;
    
    const match = matches[currentMatchIndex];
    if (!match) return;

    const item = items.find(i => i.id === match.itemId);
    if (!item) return;

    const currentValue = item[match.field as keyof RundownItem] as string;
    if (typeof currentValue !== 'string') return;

    const newValue = 
      currentValue.substring(0, match.index) +
      replaceTerm +
      currentValue.substring(match.index + match.length);

    updateItem(match.itemId, match.field, newValue);
    
    // Move to next match after replace
    goToNext();
  }, [matches, currentMatchIndex, replaceTerm, items, updateItem, goToNext]);

  const replaceAll = useCallback(() => {
    if (matches.length === 0 || !replaceTerm) return;

    // Group matches by item and field, then process in reverse order to maintain indices
    const matchesByItemField = new Map<string, FindReplaceMatch[]>();
    
    matches.forEach(match => {
      const key = `${match.itemId}-${match.field}`;
      if (!matchesByItemField.has(key)) {
        matchesByItemField.set(key, []);
      }
      matchesByItemField.get(key)!.push(match);
    });

    matchesByItemField.forEach((itemMatches, key) => {
      const [itemId, field] = key.split('-');
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const currentValue = item[field as keyof RundownItem] as string;
      if (typeof currentValue !== 'string') return;

      // Sort matches by index in reverse order to maintain correct indices during replacement
      const sortedMatches = itemMatches.sort((a, b) => b.index - a.index);
      
      let newValue = currentValue;
      sortedMatches.forEach(match => {
        newValue = 
          newValue.substring(0, match.index) +
          replaceTerm +
          newValue.substring(match.index + match.length);
      });

      updateItem(itemId, field, newValue);
    });

    setCurrentMatchIndex(0);
  }, [matches, replaceTerm, items, updateItem]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
    setReplaceTerm('');
    setCurrentMatchIndex(0);
  }, []);

  return {
    isOpen,
    setIsOpen,
    searchTerm,
    setSearchTerm,
    replaceTerm,
    setReplaceTerm,
    caseSensitive,
    setCaseSensitive,
    matches,
    totalMatches,
    currentMatchIndex: totalMatches > 0 ? currentMatchIndex + 1 : 0,
    goToNext,
    goToPrevious,
    replaceCurrent,
    replaceAll,
    close,
    hasMatches: totalMatches > 0
  };
};
