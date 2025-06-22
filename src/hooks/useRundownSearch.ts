
import { useState, useCallback, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { useToast } from '@/hooks/use-toast';

interface SearchMatch {
  itemId: string;
  field: string;
  index: number;
  length: number;
  text: string;
}

interface UseRundownSearchProps {
  items: RundownItem[];
  updateItem: (id: string, field: string, value: string) => void;
  onNavigateToMatch?: (itemId: string, field: string) => void;
}

export const useRundownSearch = ({
  items,
  updateItem,
  onNavigateToMatch
}: UseRundownSearchProps) => {
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWords, setWholeWords] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Searchable fields in RundownItem
  const searchableFields = ['name', 'script', 'notes', 'talent', 'gfx', 'video', 'images'] as const;

  // Find all matches in the rundown
  const matches = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const allMatches: SearchMatch[] = [];
    let searchPattern = searchTerm;

    // Create regex pattern based on options
    if (wholeWords) {
      searchPattern = `\\b${searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`;
    } else {
      searchPattern = searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(searchPattern, flags);

    items.forEach(item => {
      searchableFields.forEach(field => {
        const fieldValue = item[field] || '';
        if (typeof fieldValue === 'string' && fieldValue.length > 0) {
          let match;
          const fieldRegex = new RegExp(searchPattern, flags);
          
          while ((match = fieldRegex.exec(fieldValue)) !== null) {
            allMatches.push({
              itemId: item.id,
              field,
              index: match.index,
              length: match[0].length,
              text: fieldValue
            });
            
            // Prevent infinite loop on zero-length matches
            if (match[0].length === 0) break;
          }
        }
      });
    });

    return allMatches;
  }, [items, searchTerm, matchCase, wholeWords]);

  // Navigate to next match
  const findNext = useCallback(() => {
    if (matches.length === 0) return;
    
    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    
    const match = matches[nextIndex];
    if (onNavigateToMatch) {
      onNavigateToMatch(match.itemId, match.field);
    }
  }, [matches, currentMatchIndex, onNavigateToMatch]);

  // Navigate to previous match
  const findPrevious = useCallback(() => {
    if (matches.length === 0) return;
    
    const prevIndex = currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    
    const match = matches[prevIndex];
    if (onNavigateToMatch) {
      onNavigateToMatch(match.itemId, match.field);
    }
  }, [matches, currentMatchIndex, onNavigateToMatch]);

  // Replace current match
  const replaceCurrent = useCallback(() => {
    if (matches.length === 0 || !replaceTerm) return;
    
    const currentMatch = matches[currentMatchIndex];
    const item = items.find(i => i.id === currentMatch.itemId);
    
    if (!item) return;
    
    const fieldValue = item[currentMatch.field as keyof RundownItem] as string || '';
    const beforeMatch = fieldValue.substring(0, currentMatch.index);
    const afterMatch = fieldValue.substring(currentMatch.index + currentMatch.length);
    const newValue = beforeMatch + replaceTerm + afterMatch;
    
    updateItem(currentMatch.itemId, currentMatch.field, newValue);
    
    toast({
      title: 'Replaced',
      description: `Replaced "${searchTerm}" with "${replaceTerm}" in ${currentMatch.field}`,
    });
  }, [matches, currentMatchIndex, replaceTerm, items, updateItem, searchTerm, toast]);

  // Replace all matches
  const replaceAll = useCallback(() => {
    if (matches.length === 0 || !replaceTerm) return;
    
    const replacementsByItem: { [itemId: string]: { [field: string]: string } } = {};
    
    // Group matches by item and field
    matches.forEach(match => {
      if (!replacementsByItem[match.itemId]) {
        replacementsByItem[match.itemId] = {};
      }
      
      const item = items.find(i => i.id === match.itemId);
      if (!item) return;
      
      const fieldValue = item[match.field as keyof RundownItem] as string || '';
      
      if (!replacementsByItem[match.itemId][match.field]) {
        // Create regex for replacement
        let searchPattern = searchTerm;
        if (wholeWords) {
          searchPattern = `\\b${searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`;
        } else {
          searchPattern = searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        
        const flags = matchCase ? 'g' : 'gi';
        const regex = new RegExp(searchPattern, flags);
        
        replacementsByItem[match.itemId][match.field] = fieldValue.replace(regex, replaceTerm);
      }
    });
    
    // Apply all replacements
    let totalReplacements = 0;
    Object.entries(replacementsByItem).forEach(([itemId, fields]) => {
      Object.entries(fields).forEach(([field, newValue]) => {
        updateItem(itemId, field, newValue);
        totalReplacements++;
      });
    });
    
    toast({
      title: 'Replace All Complete',
      description: `Replaced ${matches.length} instances of "${searchTerm}" with "${replaceTerm}" across ${totalReplacements} fields`,
    });
    
    // Reset search after replace all
    setSearchTerm('');
    setReplaceTerm('');
  }, [matches, replaceTerm, items, updateItem, searchTerm, matchCase, wholeWords, toast]);

  // Reset search when search term changes
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentMatchIndex(0);
  }, []);

  // Get current match for highlighting
  const getCurrentMatch = useCallback(() => {
    if (matches.length === 0) return null;
    return matches[currentMatchIndex];
  }, [matches, currentMatchIndex]);

  // Check if a specific item/field has matches
  const hasMatches = useCallback((itemId: string, field: string) => {
    return matches.some(match => match.itemId === itemId && match.field === field);
  }, [matches]);

  // Check if a specific item/field is the current match
  const isCurrentMatch = useCallback((itemId: string, field: string) => {
    const currentMatch = getCurrentMatch();
    return currentMatch?.itemId === itemId && currentMatch?.field === field;
  }, [getCurrentMatch]);

  return {
    // State
    searchTerm,
    replaceTerm,
    matchCase,
    wholeWords,
    currentMatch: matches.length > 0 ? currentMatchIndex + 1 : 0,
    totalMatches: matches.length,
    
    // Actions
    onSearchChange: handleSearchChange,
    onReplaceChange: setReplaceTerm,
    onMatchCaseChange: setMatchCase,
    onWholeWordsChange: setWholeWords,
    onFindNext: findNext,
    onFindPrevious: findPrevious,
    onReplaceCurrent: replaceCurrent,
    onReplaceAll: replaceAll,
    
    // Utilities
    getCurrentMatch,
    hasMatches,
    isCurrentMatch,
    matches
  };
};
