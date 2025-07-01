
import { useState, useMemo, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

export interface SearchMatch {
  itemId: string;
  columnKey: string;
  text: string;
  startIndex: number;
  endIndex: number;
  matchIndex: number; // Global match index across all items
}

export interface SearchState {
  query: string;
  isOpen: boolean;
  caseSensitive: boolean;
  wholeWords: boolean;
  replaceText: string;
  currentMatchIndex: number;
  matches: SearchMatch[];
  totalMatches: number;
}

export interface SearchActions {
  setQuery: (query: string) => void;
  setReplaceText: (text: string) => void;
  setCaseSensitive: (value: boolean) => void;
  setWholeWords: (value: boolean) => void;
  openSearch: () => void;
  closeSearch: () => void;
  nextMatch: () => void;
  previousMatch: () => void;
  replaceCurrentMatch: () => void;
  replaceAllMatches: () => void;
}

const useRundownSearch = (
  items: RundownItem[],
  columns: Column[],
  onUpdateItem: (id: string, field: string, value: string) => void
) => {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    isOpen: false,
    caseSensitive: false,
    wholeWords: false,
    replaceText: '',
    currentMatchIndex: 0,
    matches: [],
    totalMatches: 0
  });

  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Extract searchable text from an item for a specific column
  const extractCellText = useCallback((item: RundownItem, column: Column): string => {
    if (column.isCustom) {
      return item.customFields?.[column.key] || '';
    }
    
    switch (column.key) {
      case 'segmentName':
      case 'name':
        return item.name || '';
      case 'duration':
        return item.duration || '';
      case 'talent':
        return item.talent || '';
      case 'script':
        return item.script || '';
      case 'notes':
        return item.notes || '';
      case 'gfx':
        return item.gfx || '';
      case 'video':
        return item.video || '';
      case 'images':
        return item.images || '';
      default:
        return (item as any)[column.key] || '';
    }
  }, []);

  // Create search regex based on options
  const createSearchRegex = useCallback((query: string, caseSensitive: boolean, wholeWords: boolean) => {
    if (!query.trim()) return null;
    
    try {
      let pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex chars
      if (wholeWords) {
        pattern = `\\b${pattern}\\b`;
      }
      return new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    } catch (error) {
      console.warn('Invalid search pattern:', error);
      return null;
    }
  }, []);

  // Find all matches across all items and columns
  const findMatches = useMemo(() => {
    if (!searchState.query.trim()) return [];
    
    const regex = createSearchRegex(searchState.query, searchState.caseSensitive, searchState.wholeWords);
    if (!regex) return [];

    const matches: SearchMatch[] = [];
    let globalMatchIndex = 0;

    // Search through all items and searchable columns
    items.forEach(item => {
      // Skip time calculation columns (read-only)
      const searchableColumns = columns.filter(col => 
        col.key !== 'startTime' && 
        col.key !== 'endTime' && 
        col.key !== 'elapsedTime'
      );

      searchableColumns.forEach(column => {
        const text = extractCellText(item, column);
        if (!text) return;

        // Find all matches in this cell
        let match;
        regex.lastIndex = 0; // Reset regex state
        while ((match = regex.exec(text)) !== null) {
          matches.push({
            itemId: item.id,
            columnKey: column.key,
            text: text,
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            matchIndex: globalMatchIndex++
          });
        }
      });
    });

    return matches;
  }, [items, columns, searchState.query, searchState.caseSensitive, searchState.wholeWords, extractCellText, createSearchRegex]);

  // Debounced search update
  const updateSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchState(prev => ({
        ...prev,
        query,
        matches: findMatches,
        totalMatches: findMatches.length,
        currentMatchIndex: 0
      }));
    }, 300);
  }, [findMatches]);

  // Search actions
  const setQuery = useCallback((query: string) => {
    updateSearch(query);
  }, [updateSearch]);

  const setReplaceText = useCallback((text: string) => {
    setSearchState(prev => ({ ...prev, replaceText: text }));
  }, []);

  const setCaseSensitive = useCallback((value: boolean) => {
    setSearchState(prev => ({ ...prev, caseSensitive: value }));
  }, []);

  const setWholeWords = useCallback((value: boolean) => {
    setSearchState(prev => ({ ...prev, wholeWords: value }));
  }, []);

  const openSearch = useCallback(() => {
    setSearchState(prev => ({ ...prev, isOpen: true }));
  }, []);

  const closeSearch = useCallback(() => {
    setSearchState(prev => ({ 
      ...prev, 
      isOpen: false,
      query: '',
      matches: [],
      totalMatches: 0,
      currentMatchIndex: 0
    }));
  }, []);

  const nextMatch = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      currentMatchIndex: prev.totalMatches > 0 ? (prev.currentMatchIndex + 1) % prev.totalMatches : 0
    }));
  }, []);

  const previousMatch = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      currentMatchIndex: prev.totalMatches > 0 ? (prev.currentMatchIndex - 1 + prev.totalMatches) % prev.totalMatches : 0
    }));
  }, []);

  const replaceCurrentMatch = useCallback(() => {
    if (searchState.matches.length === 0 || !searchState.replaceText) return;
    
    const currentMatch = searchState.matches[searchState.currentMatchIndex];
    if (!currentMatch) return;

    const originalText = currentMatch.text;
    const newText = originalText.substring(0, currentMatch.startIndex) + 
                   searchState.replaceText + 
                   originalText.substring(currentMatch.endIndex);

    // Update the item
    const column = columns.find(col => col.key === currentMatch.columnKey);
    if (column) {
      if (column.isCustom) {
        onUpdateItem(currentMatch.itemId, `customFields.${column.key}`, newText);
      } else {
        const field = (column.key === 'segmentName' || column.key === 'name') ? 'name' : column.key;
        onUpdateItem(currentMatch.itemId, field, newText);
      }
    }

    // Move to next match after replacement
    nextMatch();
  }, [searchState, columns, onUpdateItem, nextMatch]);

  const replaceAllMatches = useCallback(() => {
    if (searchState.matches.length === 0 || !searchState.replaceText) return;

    // Group matches by item and column to batch updates
    const updates = new Map<string, Map<string, string>>();

    searchState.matches.forEach(match => {
      const key = `${match.itemId}-${match.columnKey}`;
      if (!updates.has(key)) {
        updates.set(key, new Map([
          ['itemId', match.itemId],
          ['columnKey', match.columnKey],
          ['originalText', match.text]
        ]));
      }
    });

    // Apply all replacements
    updates.forEach((updateData) => {
      const itemId = updateData.get('itemId')!;
      const columnKey = updateData.get('columnKey')!;
      const originalText = updateData.get('originalText')!;
      
      const regex = createSearchRegex(searchState.query, searchState.caseSensitive, searchState.wholeWords);
      if (!regex) return;

      const newText = originalText.replace(regex, searchState.replaceText);
      
      const column = columns.find(col => col.key === columnKey);
      if (column) {
        if (column.isCustom) {
          onUpdateItem(itemId, `customFields.${column.key}`, newText);
        } else {
          const field = (column.key === 'segmentName' || column.key === 'name') ? 'name' : column.key;
          onUpdateItem(itemId, field, newText);
        }
      }
    });

    // Clear search after replace all
    closeSearch();
  }, [searchState, columns, onUpdateItem, createSearchRegex, closeSearch]);

  // Update matches when search parameters change
  React.useEffect(() => {
    setSearchState(prev => ({
      ...prev,
      matches: findMatches,
      totalMatches: findMatches.length,
      currentMatchIndex: Math.min(prev.currentMatchIndex, Math.max(0, findMatches.length - 1))
    }));
  }, [findMatches]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const actions: SearchActions = {
    setQuery,
    setReplaceText,
    setCaseSensitive,
    setWholeWords,
    openSearch,
    closeSearch,
    nextMatch,
    previousMatch,
    replaceCurrentMatch,
    replaceAllMatches
  };

  return {
    searchState,
    actions,
    currentMatch: searchState.matches[searchState.currentMatchIndex] || null
  };
};

export default useRundownSearch;
