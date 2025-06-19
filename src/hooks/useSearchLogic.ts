
import { useState, useMemo, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

export interface SearchMatch {
  itemId: string;
  field: string;
  matchIndex: number;
  matchText: string;
  startPos: number;
  endPos: number;
}

export interface SearchState {
  searchTerm: string;
  replaceTerm: string;
  matches: SearchMatch[];
  currentMatchIndex: number;
  isSearching: boolean;
  caseSensitive: boolean;
  wholeWords: boolean;
}

const SEARCHABLE_FIELDS = ['name', 'talent', 'script', 'gfx', 'video', 'images', 'notes'];

export const useSearchLogic = (items: RundownItem[]) => {
  const [searchState, setSearchState] = useState<SearchState>({
    searchTerm: '',
    replaceTerm: '',
    matches: [],
    currentMatchIndex: -1,
    isSearching: false,
    caseSensitive: false,
    wholeWords: false
  });

  const findMatches = useCallback((term: string, caseSensitive: boolean, wholeWords: boolean): SearchMatch[] => {
    if (!term.trim()) return [];

    const matches: SearchMatch[] = [];
    const searchRegex = wholeWords 
      ? new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, caseSensitive ? 'g' : 'gi')
      : new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');

    items.forEach(item => {
      SEARCHABLE_FIELDS.forEach(field => {
        const fieldValue = item[field as keyof RundownItem] as string || '';
        let match;
        let matchIndex = 0;
        
        while ((match = searchRegex.exec(fieldValue)) !== null) {
          matches.push({
            itemId: item.id,
            field,
            matchIndex,
            matchText: match[0],
            startPos: match.index,
            endPos: match.index + match[0].length
          });
          matchIndex++;
          
          // Prevent infinite loop with zero-width matches
          if (match.index === searchRegex.lastIndex) {
            searchRegex.lastIndex++;
          }
        }
        
        // Reset regex for next field
        searchRegex.lastIndex = 0;
      });
    });

    return matches;
  }, [items]);

  const performSearch = useCallback((term: string) => {
    setSearchState(prev => ({ ...prev, isSearching: true }));
    
    const matches = findMatches(term, searchState.caseSensitive, searchState.wholeWords);
    
    setSearchState(prev => ({
      ...prev,
      searchTerm: term,
      matches,
      currentMatchIndex: matches.length > 0 ? 0 : -1,
      isSearching: false
    }));
  }, [findMatches, searchState.caseSensitive, searchState.wholeWords]);

  const navigateToMatch = useCallback((index: number) => {
    if (index >= 0 && index < searchState.matches.length) {
      setSearchState(prev => ({ ...prev, currentMatchIndex: index }));
      
      // Scroll to the item containing this match
      const match = searchState.matches[index];
      const element = document.querySelector(`[data-item-id="${match.itemId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [searchState.matches]);

  const nextMatch = useCallback(() => {
    const nextIndex = searchState.currentMatchIndex < searchState.matches.length - 1 
      ? searchState.currentMatchIndex + 1 
      : 0;
    navigateToMatch(nextIndex);
  }, [searchState.currentMatchIndex, searchState.matches.length, navigateToMatch]);

  const previousMatch = useCallback(() => {
    const prevIndex = searchState.currentMatchIndex > 0 
      ? searchState.currentMatchIndex - 1 
      : searchState.matches.length - 1;
    navigateToMatch(prevIndex);
  }, [searchState.currentMatchIndex, searchState.matches.length, navigateToMatch]);

  const updateOptions = useCallback((options: Partial<Pick<SearchState, 'caseSensitive' | 'wholeWords'>>) => {
    setSearchState(prev => ({ ...prev, ...options }));
    
    // Re-search with new options if there's a search term
    if (searchState.searchTerm) {
      const matches = findMatches(searchState.searchTerm, 
        options.caseSensitive ?? searchState.caseSensitive, 
        options.wholeWords ?? searchState.wholeWords
      );
      setSearchState(prev => ({
        ...prev,
        matches,
        currentMatchIndex: matches.length > 0 ? 0 : -1,
        ...options
      }));
    }
  }, [searchState.searchTerm, searchState.caseSensitive, searchState.wholeWords, findMatches]);

  const setReplaceTerm = useCallback((term: string) => {
    setSearchState(prev => ({ ...prev, replaceTerm: term }));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchState({
      searchTerm: '',
      replaceTerm: '',
      matches: [],
      currentMatchIndex: -1,
      isSearching: false,
      caseSensitive: false,
      wholeWords: false
    });
  }, []);

  return {
    searchState,
    performSearch,
    navigateToMatch,
    nextMatch,
    previousMatch,
    updateOptions,
    setReplaceTerm,
    clearSearch
  };
};
