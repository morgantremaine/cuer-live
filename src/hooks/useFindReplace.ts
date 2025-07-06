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

export const useFindReplace = (onUpdateItem?: (id: string, field: string, value: string) => void, items?: any[]) => {
  const directState = useDirectRundownState();
  const [lastSearchResults, setLastSearchResults] = useState<{
    matches: Array<{ itemId: string, field: string, matchCount: number }>;
    totalMatches: number;
  }>({ matches: [], totalMatches: 0 });

  // Use provided items or fall back to directState items
  const currentItems = items || directState.items;

  const findMatches = useCallback((options: FindReplaceOptions) => {
    const { searchTerm, fields } = options;
    
    if (!searchTerm.trim()) {
      setLastSearchResults({ matches: [], totalMatches: 0 });
      return { matches: [], totalMatches: 0 };
    }

    let searchRegex: RegExp;
    try {
      // Always search case-insensitively for find
      const flags = 'gi';
      const pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchRegex = new RegExp(pattern, flags);
    } catch (error) {
      console.error('🔍 Invalid search regex:', error);
      return { matches: [], totalMatches: 0 };
    }

    const matches: Array<{ itemId: string, field: string, matchCount: number }> = [];
    let totalMatches = 0;

    currentItems.forEach((item: RundownItem) => {
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
    
    return results;
  }, [currentItems]);

  // Helper function to match capitalization pattern
  const matchCapitalization = useCallback((original: string, replacement: string): string => {
    if (original === original.toLowerCase()) {
      // Original is all lowercase
      return replacement.toLowerCase();
    } else if (original === original.toUpperCase()) {
      // Original is all uppercase
      return replacement.toUpperCase();
    } else if (original[0] === original[0].toUpperCase() && original.slice(1) === original.slice(1).toLowerCase()) {
      // Original is title case (first letter uppercase, rest lowercase)
      return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
    } else {
      // Mixed case or other pattern - return replacement as-is
      return replacement;
    }
  }, []);

  const replaceAll = useCallback((options: FindReplaceOptions) => {
    const { searchTerm, replaceTerm, fields, caseSensitive } = options;
    
    if (!searchTerm.trim()) {
      return { replacements: 0 };
    }

    let searchRegex: RegExp;
    try {
      // Always search case-insensitively
      const flags = 'gi';
      const pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchRegex = new RegExp(pattern, flags);
    } catch (error) {
      console.error('🔄 Invalid search regex:', error);
      return { replacements: 0 };
    }

    let totalReplacements = 0;
    
    currentItems.forEach((item: RundownItem) => {
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
            let newValue = fieldValue;
            
            if (caseSensitive) {
              // Smart case replacement - preserve original capitalization
              newValue = fieldValue.replace(searchRegex, (match) => {
                return matchCapitalization(match, replaceTerm);
              });
            } else {
              // Simple replacement - use exact replacement term
              newValue = fieldValue.replace(searchRegex, replaceTerm);
            }
            
            // Use the same update mechanism as manual user edits
            if (onUpdateItem) {
              onUpdateItem(item.id, field, newValue);
            } else {
              directState.updateItem(item.id, field, newValue);
            }
            
            totalReplacements += beforeMatches.length;
          }
        }
      });
    });
    
    // Clear search results after replacement
    setLastSearchResults({ matches: [], totalMatches: 0 });
    
    return { replacements: totalReplacements };
  }, [currentItems, onUpdateItem, directState.updateItem, matchCapitalization]);

  const clearResults = useCallback(() => {
    setLastSearchResults({ matches: [], totalMatches: 0 });
  }, []);

  return {
    findMatches,
    replaceAll,
    lastSearchResults,
    clearResults,
    // Expose current items for preview purposes
    items: currentItems
  };
};