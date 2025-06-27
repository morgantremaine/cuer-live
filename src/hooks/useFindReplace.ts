
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

// Searchable fields that correspond to actual item properties
const SEARCHABLE_FIELDS = [
  'name',
  'talent', 
  'script',
  'gfx',
  'video',
  'images',
  'notes'
] as const;

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
      SEARCHABLE_FIELDS.forEach(fieldKey => {
        // Get field value from item
        let fieldValue = '';
        
        // Handle direct properties
        if (fieldKey in item) {
          fieldValue = (item as any)[fieldKey] || '';
        }
        
        // Also check custom fields
        if (!fieldValue && item.customFields && item.customFields[fieldKey]) {
          fieldValue = item.customFields[fieldKey];
        }
        
        if (!fieldValue) return;
        
        const searchableValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();
        
        let startIndex = 0;
        while (true) {
          const foundIndex = searchableValue.indexOf(searchValue, startIndex);
          if (foundIndex === -1) break;
          
          allMatches.push({
            itemId: item.id,
            field: fieldKey,
            startIndex: foundIndex,
            endIndex: foundIndex + searchTerm.length,
            text: fieldValue.substring(foundIndex, foundIndex + searchTerm.length)
          });
          
          startIndex = foundIndex + 1;
        }
      });
    });

    console.log('🔍 Found matches:', allMatches);
    return allMatches;
  }, [items, searchTerm, caseSensitive]);

  // Navigate to specific match
  const goToMatch = useCallback((index: number) => {
    if (matches.length === 0) return;
    
    const clampedIndex = Math.max(0, Math.min(index, matches.length - 1));
    setCurrentMatchIndex(clampedIndex);
    
    const match = matches[clampedIndex];
    if (match && onJumpToItem) {
      console.log('🔍 Jumping to match:', match);
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

    console.log('🔄 Replacing current match:', match, 'in item:', item);

    // Get current field value
    let currentValue = '';
    const fieldKey = match.field;
    
    // Get value from direct property or custom field
    if (fieldKey in item) {
      currentValue = (item as any)[fieldKey] || '';
    } else if (item.customFields && item.customFields[fieldKey]) {
      currentValue = item.customFields[fieldKey];
    }

    console.log('🔄 Current value:', currentValue);

    // Perform the replacement
    const newValue = currentValue.substring(0, match.startIndex) + 
                    replaceTerm + 
                    currentValue.substring(match.endIndex);

    console.log('🔄 New value:', newValue);

    // Update the item - handle both direct properties and custom fields
    if (fieldKey in item) {
      onUpdateItem(match.itemId, fieldKey, newValue);
    } else {
      // Custom field - use dot notation
      onUpdateItem(match.itemId, `customFields.${fieldKey}`, newValue);
    }

    console.log('🔄 Replacement completed');
  }, [matches, currentMatchIndex, replaceTerm, items, onUpdateItem]);

  // Replace all matches
  const replaceAll = useCallback(() => {
    if (matches.length === 0 || !replaceTerm) return;

    console.log('🔄 Starting replace all for', matches.length, 'matches');

    // Group matches by item and field
    const groupedMatches = matches.reduce((acc, match) => {
      const key = `${match.itemId}-${match.field}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(match);
      return acc;
    }, {} as Record<string, FindMatch[]>);

    // Process each field
    Object.entries(groupedMatches).forEach(([key, fieldMatches]) => {
      const [itemId, fieldKey] = key.split('-');
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      console.log('🔄 Processing field:', fieldKey, 'for item:', itemId);

      // Get current field value
      let fieldValue = '';
      if (fieldKey in item) {
        fieldValue = (item as any)[fieldKey] || '';
      } else if (item.customFields && item.customFields[fieldKey]) {
        fieldValue = item.customFields[fieldKey];
      }
      
      console.log('🔄 Original field value:', fieldValue);
      
      // Replace all occurrences using regex
      const searchValue = caseSensitive 
        ? searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        : searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      const regex = new RegExp(searchValue, caseSensitive ? 'g' : 'gi');
      const newValue = fieldValue.replace(regex, replaceTerm);
      
      console.log('🔄 New field value:', newValue);
      
      // Update the item
      if (fieldKey in item) {
        onUpdateItem(itemId, fieldKey, newValue);
      } else {
        onUpdateItem(itemId, `customFields.${fieldKey}`, newValue);
      }
    });

    console.log('🔄 Replace all completed');
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
