
import { useState, useEffect, useMemo } from 'react';

interface UseFindReplaceProps {
  items: any[];
  onUpdateItem: (itemId: string, field: string, value: string) => void;
  onJumpToItem?: (itemId: string) => void;
}

export const useFindReplace = ({ items, onUpdateItem, onJumpToItem }: UseFindReplaceProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Find all matches across all items and fields
  const matches = useMemo(() => {
    if (!searchTerm) return [];
    
    const searchableFields = ['name', 'talent', 'script', 'gfx', 'video', 'images', 'notes'];
    const allMatches: Array<{
      itemId: string;
      field: string;
      value: string;
      matchIndex: number;
      startIndex: number;
      endIndex: number;
    }> = [];

    items.forEach((item) => {
      searchableFields.forEach((field) => {
        const value = item[field] || '';
        const searchText = caseSensitive ? value : value.toLowerCase();
        const searchQuery = caseSensitive ? searchTerm : searchTerm.toLowerCase();
        
        let startIndex = 0;
        let matchIndex = 0;
        
        while (true) {
          const foundIndex = searchText.indexOf(searchQuery, startIndex);
          if (foundIndex === -1) break;
          
          allMatches.push({
            itemId: item.id,
            field,
            value,
            matchIndex,
            startIndex: foundIndex,
            endIndex: foundIndex + searchQuery.length
          });
          
          startIndex = foundIndex + 1;
          matchIndex++;
        }
      });
    });

    return allMatches;
  }, [items, searchTerm, caseSensitive]);

  const matchCount = matches.length;

  // Reset current match index when search term changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchTerm, caseSensitive]);

  const nextMatch = () => {
    if (matchCount === 0) return;
    const nextIndex = (currentMatchIndex + 1) % matchCount;
    setCurrentMatchIndex(nextIndex);
    
    const match = matches[nextIndex];
    if (match && onJumpToItem) {
      onJumpToItem(match.itemId);
    }
  };

  const previousMatch = () => {
    if (matchCount === 0) return;
    const prevIndex = currentMatchIndex === 0 ? matchCount - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    
    const match = matches[prevIndex];
    if (match && onJumpToItem) {
      onJumpToItem(match.itemId);
    }
  };

  const replaceCurrent = () => {
    if (matchCount === 0 || !replaceTerm) return;
    
    const match = matches[currentMatchIndex];
    if (match) {
      const { itemId, field, value, startIndex, endIndex } = match;
      const newValue = value.substring(0, startIndex) + replaceTerm + value.substring(endIndex);
      onUpdateItem(itemId, field, newValue);
    }
  };

  const replaceAll = () => {
    if (matchCount === 0 || !replaceTerm) return;
    
    // Group matches by item and field to avoid conflicts
    const groupedMatches = matches.reduce((acc, match) => {
      const key = `${match.itemId}-${match.field}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(match);
      return acc;
    }, {} as Record<string, typeof matches>);

    // Replace all matches for each item/field combination
    Object.values(groupedMatches).forEach((fieldMatches) => {
      if (fieldMatches.length === 0) return;
      
      const { itemId, field, value } = fieldMatches[0];
      const searchQuery = caseSensitive ? searchTerm : searchTerm.toLowerCase();
      const targetValue = caseSensitive ? value : value.toLowerCase();
      
      let newValue = value;
      if (caseSensitive) {
        newValue = value.replaceAll(searchTerm, replaceTerm);
      } else {
        // Case insensitive replacement preserving original case
        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        newValue = value.replace(regex, replaceTerm);
      }
      
      onUpdateItem(itemId, field, newValue);
    });
  };

  const reset = () => {
    setSearchTerm('');
    setReplaceTerm('');
    setCurrentMatchIndex(0);
  };

  return {
    searchTerm,
    setSearchTerm,
    replaceTerm,
    setReplaceTerm,
    caseSensitive,
    setCaseSensitive,
    currentMatchIndex,
    matchCount,
    matches,
    nextMatch,
    previousMatch,
    replaceCurrent,
    replaceAll,
    reset
  };
};
