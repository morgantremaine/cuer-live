
import { useState, useCallback, useMemo } from 'react';
import { RundownItem } from '@/hooks/useRundownItems';

export interface SearchMatch {
  itemId: string;
  fieldKey: string;
  index: number;
  length: number;
  text: string;
}

export interface UseSearchAndReplaceProps {
  items: RundownItem[];
  onUpdateItem: (id: string, field: string, value: string) => void;
}

export const useSearchAndReplace = ({ items, onUpdateItem }: UseSearchAndReplaceProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Search across all text fields in rundown items
  const searchableFields = ['name', 'description', 'notes', 'talent', 'location'];

  const matches = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const allMatches: SearchMatch[] = [];
    
    items.forEach((item) => {
      searchableFields.forEach((fieldKey) => {
        const fieldValue = item[fieldKey as keyof RundownItem];
        if (typeof fieldValue === 'string' && fieldValue) {
          const searchValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();
          const searchFor = caseSensitive ? searchTerm : searchTerm.toLowerCase();
          
          let searchIndex = 0;
          while (searchIndex < searchValue.length) {
            let foundIndex = searchValue.indexOf(searchFor, searchIndex);
            
            if (foundIndex === -1) break;
            
            // Check for whole word match if enabled
            if (wholeWord) {
              const isWordStart = foundIndex === 0 || !/\w/.test(searchValue[foundIndex - 1]);
              const isWordEnd = foundIndex + searchFor.length === searchValue.length || 
                               !/\w/.test(searchValue[foundIndex + searchFor.length]);
              
              if (!isWordStart || !isWordEnd) {
                searchIndex = foundIndex + 1;
                continue;
              }
            }
            
            allMatches.push({
              itemId: item.id,
              fieldKey,
              index: foundIndex,
              length: searchFor.length,
              text: fieldValue.substring(foundIndex, foundIndex + searchFor.length)
            });
            
            searchIndex = foundIndex + 1;
          }
        }
      });
    });

    return allMatches;
  }, [items, searchTerm, caseSensitive, wholeWord]);

  const replaceAll = useCallback(() => {
    if (!searchTerm.trim() || !replaceTerm) return;

    const processedItems = new Set<string>();
    
    matches.forEach((match) => {
      const key = `${match.itemId}-${match.fieldKey}`;
      if (processedItems.has(key)) return;
      
      processedItems.add(key);
      const item = items.find(i => i.id === match.itemId);
      if (!item) return;

      const fieldValue = item[match.fieldKey as keyof RundownItem] as string;
      if (!fieldValue) return;

      const flags = caseSensitive ? 'g' : 'gi';
      const regex = wholeWord 
        ? new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, flags)
        : new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

      const newValue = fieldValue.replace(regex, replaceTerm);
      onUpdateItem(match.itemId, match.fieldKey, newValue);
    });

    // Clear search after replace all
    setSearchTerm('');
    setReplaceTerm('');
  }, [matches, searchTerm, replaceTerm, caseSensitive, wholeWord, items, onUpdateItem]);

  const replaceCurrent = useCallback(() => {
    if (!searchTerm.trim() || !replaceTerm || matches.length === 0) return;

    const currentMatch = matches[currentMatchIndex];
    if (!currentMatch) return;

    const item = items.find(i => i.id === currentMatch.itemId);
    if (!item) return;

    const fieldValue = item[currentMatch.fieldKey as keyof RundownItem] as string;
    if (!fieldValue) return;

    const newValue = fieldValue.substring(0, currentMatch.index) + 
                    replaceTerm + 
                    fieldValue.substring(currentMatch.index + currentMatch.length);

    onUpdateItem(currentMatch.itemId, currentMatch.fieldKey, newValue);

    // Move to next match or clear if this was the last one
    if (matches.length === 1) {
      setSearchTerm('');
      setReplaceTerm('');
    } else {
      const nextIndex = currentMatchIndex >= matches.length - 1 ? 0 : currentMatchIndex + 1;
      setCurrentMatchIndex(nextIndex);
    }
  }, [matches, currentMatchIndex, searchTerm, replaceTerm, items, onUpdateItem]);

  const goToNext = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  const goToPrevious = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setReplaceTerm('');
    setCurrentMatchIndex(0);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    replaceTerm,
    setReplaceTerm,
    caseSensitive,
    setCaseSensitive,
    wholeWord,
    setWholeWord,
    matches,
    currentMatchIndex,
    setCurrentMatchIndex,
    isOpen,
    setIsOpen,
    replaceAll,
    replaceCurrent,
    goToNext,
    goToPrevious,
    clearSearch
  };
};
