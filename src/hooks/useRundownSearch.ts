
import { useState, useCallback, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

export interface SearchMatch {
  itemId: string;
  columnKey: string;
  text: string;
  startIndex: number;
  endIndex: number;
  rowIndex: number;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWords: boolean;
  regex: boolean;
}

export const useRundownSearch = (
  items: RundownItem[],
  columns: Column[]
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWords: false,
    regex: false
  });

  // Get searchable text from item and column
  const getSearchableText = useCallback((item: RundownItem, column: Column): string => {
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

  // Find all matches in the rundown
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const matches: SearchMatch[] = [];
    
    items.forEach((item, rowIndex) => {
      columns.forEach((column) => {
        // Skip calculated time fields
        if (['startTime', 'endTime', 'elapsedTime'].includes(column.key)) {
          return;
        }
        
        const text = getSearchableText(item, column);
        if (!text) return;
        
        let searchText = text;
        let query = searchQuery;
        
        if (!searchOptions.caseSensitive) {
          searchText = text.toLowerCase();
          query = searchQuery.toLowerCase();
        }
        
        if (searchOptions.regex) {
          try {
            const flags = searchOptions.caseSensitive ? 'g' : 'gi';
            const regex = new RegExp(query, flags);
            let match;
            
            while ((match = regex.exec(text)) !== null) {
              matches.push({
                itemId: item.id,
                columnKey: column.key,
                text: text,
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                rowIndex
              });
            }
          } catch (e) {
            // Invalid regex, fall back to simple search
          }
        } else if (searchOptions.wholeWords) {
          const regex = new RegExp(`\\b${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, searchOptions.caseSensitive ? 'g' : 'gi');
          let match;
          
          while ((match = regex.exec(text)) !== null) {
            matches.push({
              itemId: item.id,
              columnKey: column.key,
              text: text,
              startIndex: match.index,
              endIndex: match.index + match[0].length,
              rowIndex
            });
          }
        } else {
          let startIndex = 0;
          while (true) {
            const index = searchText.indexOf(query, startIndex);
            if (index === -1) break;
            
            matches.push({
              itemId: item.id,
              columnKey: column.key,
              text: text,
              startIndex: index,
              endIndex: index + query.length,
              rowIndex
            });
            
            startIndex = index + 1;
          }
        }
      });
    });
    
    return matches.sort((a, b) => {
      if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
      return a.startIndex - b.startIndex;
    });
  }, [searchQuery, items, columns, searchOptions, getSearchableText]);

  // Navigation functions
  const goToNextMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % searchMatches.length);
  }, [searchMatches.length]);

  const goToPreviousMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((prev) => prev === 0 ? searchMatches.length - 1 : prev - 1);
  }, [searchMatches.length]);

  // Get current match
  const currentMatch = searchMatches[currentMatchIndex] || null;

  // Reset current match when search changes
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentMatchIndex(0);
  }, []);

  // Check if a specific cell has a match
  const getCellMatches = useCallback((itemId: string, columnKey: string) => {
    return searchMatches.filter(match => 
      match.itemId === itemId && match.columnKey === columnKey
    );
  }, [searchMatches]);

  // Replace functionality
  const replaceCurrentMatch = useCallback((onUpdate: (id: string, field: string, value: string) => void) => {
    if (!currentMatch || !replaceQuery) return false;
    
    const { itemId, columnKey, text, startIndex, endIndex } = currentMatch;
    const newText = text.substring(0, startIndex) + replaceQuery + text.substring(endIndex);
    
    // Handle custom fields vs built-in fields
    const field = columns.find(col => col.key === columnKey)?.isCustom 
      ? `customFields.${columnKey}` 
      : columnKey === 'segmentName' ? 'name' : columnKey;
    
    onUpdate(itemId, field, newText);
    return true;
  }, [currentMatch, replaceQuery, columns]);

  const replaceAllMatches = useCallback((onUpdate: (id: string, field: string, value: string) => void) => {
    if (searchMatches.length === 0 || !replaceQuery) return 0;
    
    let replacedCount = 0;
    const processedItems = new Map<string, Map<string, string>>();
    
    // Group matches by item and column to handle multiple matches in same cell
    searchMatches.forEach((match) => {
      if (!processedItems.has(match.itemId)) {
        processedItems.set(match.itemId, new Map());
      }
      processedItems.get(match.itemId)!.set(match.columnKey, match.text);
    });
    
    // Process each item/column combination
    processedItems.forEach((columnMap, itemId) => {
      columnMap.forEach((originalText, columnKey) => {
        const itemMatches = searchMatches.filter(m => m.itemId === itemId && m.columnKey === columnKey);
        let newText = originalText;
        
        // Replace matches from end to start to maintain indices
        itemMatches.reverse().forEach((match) => {
          newText = newText.substring(0, match.startIndex) + replaceQuery + newText.substring(match.endIndex);
          replacedCount++;
        });
        
        if (newText !== originalText) {
          const field = columns.find(col => col.key === columnKey)?.isCustom 
            ? `customFields.${columnKey}` 
            : columnKey === 'segmentName' ? 'name' : columnKey;
          
          onUpdate(itemId, field, newText);
        }
      });
    });
    
    return replacedCount;
  }, [searchMatches, replaceQuery, columns]);

  return {
    searchQuery,
    replaceQuery,
    isSearchOpen,
    currentMatchIndex,
    searchOptions,
    searchMatches,
    currentMatch,
    setSearchQuery: handleSearchChange,
    setReplaceQuery,
    setIsSearchOpen,
    setSearchOptions,
    goToNextMatch,
    goToPreviousMatch,
    getCellMatches,
    replaceCurrentMatch,
    replaceAllMatches
  };
};
