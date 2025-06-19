
import React, { useState, useRef, useEffect } from 'react';
import { Search, MoreHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SearchInput from './SearchInput';
import SearchControls from './SearchControls';
import ReplaceControls from './ReplaceControls';
import { useSearch } from '@/hooks/useSearch';
import { useSearchNavigation } from '@/hooks/useSearchNavigation';
import { SearchBarProps } from '@/types/search';

const SearchBar = ({ items, visibleColumns, onHighlightMatch, onReplaceText }: SearchBarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isReplacingRef = useRef(false);

  const {
    searchText,
    setSearchText,
    matches,
    currentMatchIndex,
    setCurrentMatchIndex,
    refreshSearch
  } = useSearch(items, visibleColumns, onHighlightMatch);

  const { navigateMatch } = useSearchNavigation();

  const handleNavigate = (direction: 'next' | 'prev') => {
    navigateMatch(matches, currentMatchIndex, setCurrentMatchIndex, direction);
  };

  const handleReplace = async (replaceAll: boolean = false) => {
    if (!searchText.trim() || !replaceText.trim() || isReplacingRef.current) {
      console.log('❌ Missing search/replace text or already replacing');
      return;
    }

    isReplacingRef.current = true;
    console.log('🔄 Replace operation:', { 
      searchText: searchText.trim(), 
      replaceText: replaceText.trim(), 
      replaceAll, 
      matchesCount: matches.length 
    });

    try {
      if (replaceAll) {
        console.log('🔄 Replacing all matches');
        // Process unique item-field combinations
        const processedItems = new Set<string>();
        
        for (const match of matches) {
          const key = `${match.itemId}-${match.field}`;
          if (!processedItems.has(key)) {
            processedItems.add(key);
            console.log('✅ Replacing in item:', match.itemId, match.field);
            await onReplaceText(match.itemId, match.field, searchText.trim(), replaceText.trim(), true);
          }
        }
      } else if (currentMatchIndex >= 0 && currentMatchIndex < matches.length) {
        console.log('🔄 Replacing current match');
        const currentMatch = matches[currentMatchIndex];
        await onReplaceText(currentMatch.itemId, currentMatch.field, searchText.trim(), replaceText.trim(), false);
      }

      // Refresh search results after replacement
      setTimeout(() => {
        console.log('🔄 Refreshing search after replace');
        refreshSearch();
      }, 500);
    } catch (error) {
      console.error('❌ Replace operation failed:', error);
    } finally {
      isReplacingRef.current = false;
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchText('');
    setReplaceText('');
    setShowReplace(false);
    onHighlightMatch('', '', 0, 0);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('🔍 Search text changed:', value);
    setSearchText(value);
  };

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 w-80 z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Search</h3>
        <Button variant="ghost" size="sm" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <SearchInput
            ref={searchInputRef}
            value={searchText}
            onChange={handleSearchChange}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setShowReplace(!showReplace)}>
                Find & Replace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {showReplace && (
          <ReplaceControls
            replaceText={replaceText}
            onReplaceTextChange={setReplaceText}
            onReplace={() => handleReplace(false)}
            onReplaceAll={() => handleReplace(true)}
            hasMatches={matches.length > 0}
          />
        )}

        <SearchControls
          currentMatchIndex={currentMatchIndex}
          totalMatches={matches.length}
          onNavigate={handleNavigate}
        />

        {searchText && matches.length === 0 && (
          <div className="text-sm text-red-500 dark:text-red-400">
            No matches found for "{searchText}"
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
