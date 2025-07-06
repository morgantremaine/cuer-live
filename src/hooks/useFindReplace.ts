import { useState, useCallback } from 'react';
import { useDirectRundownState } from './useDirectRundownState';
import { RundownItem } from '@/types/rundown';

export interface FindReplaceOptions {
  searchTerm: string;
  replaceTerm: string;
  fields: string[];
  caseSensitive: boolean;
  wholeWord: boolean;
}

export const useFindReplace = (onUpdateItem?: (id: string, field: string, value: string) => void) => {
  const directState = useDirectRundownState();
  const [lastSearchResults, setLastSearchResults] = useState<{
    matches: Array<{ itemId: string, field: string, matchCount: number }>;
    totalMatches: number;
  }>({ matches: [], totalMatches: 0 });

  const findMatches = useCallback((options: FindReplaceOptions) => {
    console.log('🔍 Starting find operation:', options);
    
    const { searchTerm, fields, caseSensitive, wholeWord } = options;
    
    if (!searchTerm.trim()) {
      setLastSearchResults({ matches: [], totalMatches: 0 });
      return { matches: [], totalMatches: 0 };
    }

    let searchRegex: RegExp;
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const pattern = wholeWord ? `\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b` : searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchRegex = new RegExp(pattern, flags);
    } catch (error) {
      console.error('🔍 Invalid search regex:', error);
      return { matches: [], totalMatches: 0 };
    }

    const matches: Array<{ itemId: string, field: string, matchCount: number }> = [];
    let totalMatches = 0;

    directState.items.forEach((item: RundownItem) => {
      fields.forEach(field => {
        let fieldValue = '';
        
        // Handle different field types
        if (field.startsWith('customFields.')) {
          const customFieldKey = field.replace('customFields.', '');
          fieldValue = item.customFields?.[customFieldKey] || '';
        } else {
          fieldValue = (item as any)[field] || '';
        }

        if (typeof fieldValue === 'string' && fieldValue) {
          const fieldMatches = fieldValue.match(searchRegex);
          if (fieldMatches && fieldMatches.length > 0) {
            matches.push({
              itemId: item.id,
              field,
              matchCount: fieldMatches.length
            });
            totalMatches += fieldMatches.length;
          }
        }
      });
    });

    const results = { matches, totalMatches };
    setLastSearchResults(results);
    
    console.log('🔍 Find results:', results);
    return results;
  }, [directState.items]);

  const replaceAll = useCallback((options: FindReplaceOptions) => {
    console.log('🔄 Starting replace all operation:', options);
    
    const { searchTerm, replaceTerm, fields, caseSensitive, wholeWord } = options;
    
    if (!searchTerm.trim()) {
      console.log('🔄 No search term provided');
      return { replacements: 0 };
    }

    let searchRegex: RegExp;
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const pattern = wholeWord ? `\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b` : searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchRegex = new RegExp(pattern, flags);
    } catch (error) {
      console.error('🔄 Invalid search regex:', error);
      return { replacements: 0 };
    }

    let totalReplacements = 0;

    directState.items.forEach((item: RundownItem) => {
      fields.forEach(field => {
        let fieldValue = '';
        
        // Handle different field types
        if (field.startsWith('customFields.')) {
          const customFieldKey = field.replace('customFields.', '');
          fieldValue = item.customFields?.[customFieldKey] || '';
        } else {
          fieldValue = (item as any)[field] || '';
        }

        if (typeof fieldValue === 'string' && fieldValue) {
          const beforeMatches = fieldValue.match(searchRegex);
          if (beforeMatches && beforeMatches.length > 0) {
            const newValue = fieldValue.replace(searchRegex, replaceTerm);
            
            console.log('🔄 Replacing in item:', {
              itemId: item.id,
              field,
              oldValue: fieldValue,
              newValue,
              matches: beforeMatches.length
            });

            // Use the same update mechanism as manual edits
            if (onUpdateItem) {
              onUpdateItem(item.id, field, newValue);
            } else {
              // Fallback to direct state if no update function provided
              directState.updateItem(item.id, field, newValue);
            }
            
            totalReplacements += beforeMatches.length;
          }
        }
      });
    });

    console.log('🔄 Replace all completed:', { totalReplacements });
    
    // Clear search results after replacement
    setLastSearchResults({ matches: [], totalMatches: 0 });
    
    return { replacements: totalReplacements };
  }, [directState.items, onUpdateItem, directState.updateItem]);

  return {
    findMatches,
    replaceAll,
    lastSearchResults,
    // Expose items for preview purposes
    items: directState.items
  };
};