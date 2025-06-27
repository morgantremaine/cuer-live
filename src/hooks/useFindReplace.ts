
import { useState, useCallback, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';

interface FindMatch {
  itemId: string;
  field: string;
  startIndex: number;
  endIndex: number;
  text: string;
}

interface UseFindReplaceProps {
  items: RundownItem[];
  onUpdateItem: (id: string, field: string, value: string) => void;
  onJumpToItem?: (itemId: string) => void;
}

const SEARCHABLE_FIELDS = ['name', 'talent', 'script', 'gfx', 'video', 'images', 'notes'] as const;

export const useFindReplace = ({ items, onUpdateItem, onJumpToItem }: UseFindReplaceProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Find all matches in the rundown
  const matches = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const allMatches: FindMatch[] = [];
    const searchValue = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    items.forEach(item => {
      SEARCHABLE_FIELDS.forEach(field => {
        const fieldValue = item[field] || '';
        const searchableValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();
        
        let startIndex = 0;
        while (true) {
          const foundIndex = searchableValue.indexOf(searchValue, startIndex);
          if (foundIndex === -1) break;
          
          allMatches.push({
            itemId: item.id,
            field,
            startIndex: foundIndex,
            endIndex: foundIndex + searchTerm.length,
            text: fieldValue.substring(foundIndex, foundIndex + searchTerm.length)
          });
          
          startIndex = foundIndex + 1;
        }
      });
    });

    return allMatches;
  }, [items, searchTerm, caseSensitive]);

  // Navigate to specific match
  const goToMatch = useCallback((index: number) => {
    if (matches.length === 0) return;
    
    const clampedIndex = Math.max(0, Math.min(index, matches.length - 1));
    setCurrentMatchIndex(clampedIndex);
    
    const match = matches[clampedIndex];
    if (match && onJumpToItem) {
      onJumpToItem(match.itemId);
    }
  }, [matches, onJumpToItem]);

  // Navigate to next match
  const nextMatch = useCallback(() => {
    const nextIndex = currentMatchIndex + 1;
    if (nextIndex >= matches.length) {
      goToMatch(0); // Wrap to first match
    } else {
      goToMatch(nextIndex);
    }
  }, [currentMatchIndex, matches.length, goToMatch]);

  // Navigate to previous match
  const previousMatch = useCallback(() => {
    const prevIndex = currentMatchIndex - 1;
    if (prevIndex < 0) {
      goToMatch(matches.length - 1); // Wrap to last match
    } else {
      goToMatch(prevIndex);
    }
  }, [currentMatchIndex, matches.length, goToMatch]);

  // Replace current match
  const replaceCurrent = useCallback(() => {
    if (matches.length === 0 || !replaceTerm) return;
    
    const match = matches[currentMatchIndex];
    if (!match) return;

    const item = items.find(i => i.id === match.itemId);
    if (!item) return;

    const fieldValue = item[match.field] || '';
    const newValue = fieldValue.substring(0, match.startIndex) + 
                    replaceTerm + 
                    fieldValue.substring(match.endIndex);

    onUpdateItem(match.itemId, match.field, newValue);
  }, [matches, currentMatchIndex, replaceTerm, items, onUpdateItem]);

  // Replace all matches
  const replaceAll = useCallback(() => {
    if (matches.length === 0 || !replaceTerm) return;

    // Group matches by item and field
    const groupedMatches = matches.reduce((acc, match) => {
      const key = `${match.itemId}-${match.field}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(match);
      return acc;
    }, {} as Record<string, FindMatch[]>);

    // Process each field
    Object.entries(groupedMatches).forEach(([key, fieldMatches]) => {
      const [itemId, field] = key.split('-');
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      let fieldValue = item[field] || '';
      const searchValue = caseSensitive ? searchTerm : searchTerm.toLowerCase();
      const replaceValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();
      
      // Replace all occurrences
      const regex = new RegExp(
        searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 
        caseSensitive ? 'g' : 'gi'
      );
      
      const newValue = fieldValue.replace(regex, replaceTerm);
      onUpdateItem(itemId, field, newValue);
    });
  }, [matches, replaceTerm, searchTerm, caseSensitive, items, onUpdateItem]);

  // Reset search
  const reset = useCallback(() => {
    setSearchTerm('');
    setReplaceTerm('');
    setCurrentMatchIndex(0);
  }, []);

  // Open/close dialog
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    reset();
  }, [reset]);

  return {
    // State
    searchTerm,
    replaceTerm,
    caseSensitive,
    currentMatchIndex,
    matches,
    isOpen,
    
    // Current match info
    currentMatch: matches[currentMatchIndex] || null,
    matchCount: matches.length,
    
    // Actions
    setSearchTerm,
    setReplaceTerm,
    setCaseSensitive,
    nextMatch,
    previousMatch,
    goToMatch,
    replaceCurrent,
    replaceAll,
    reset,
    open,
    close
  };
};
