
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
import { useTextReplace } from '@/hooks/useTextReplace';
import { SearchBarProps } from '@/types/search';
import { useToast } from '@/hooks/use-toast';

const SearchBar = ({ 
  items, 
  visibleColumns, 
  onHighlightMatch, 
  onReplaceText,
  updateItem,
  saveUndoState,
  columns,
  title
}: SearchBarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Provide default values for optional props
  const safeItems = items || [];
  const safeVisibleColumns = visibleColumns || [];
  const safeColumns = columns || [];
  const safeTitle = title || '';

  const {
    searchText,
    setSearchText,
    matches,
    currentMatchIndex,
    setCurrentMatchIndex,
    performSearch
  } = useSearch(safeItems, safeVisibleColumns, onHighlightMatch);

  const { navigateMatch } = useSearchNavigation();

  const {
    isReplacing,
    lastReplaceResult,
    replaceInCurrentMatch,
    replaceAll: replaceAllMatches,
    clearLastResult
  } = useTextReplace({
    items: safeItems,
    visibleColumns: safeVisibleColumns,
    updateItem: updateItem || (() => {}),
    saveUndoState,
    columns: safeColumns,
    title: safeTitle
  });

  const handleNavigate = (direction: 'next' | 'prev') => {
    navigateMatch(matches, currentMatchIndex, setCurrentMatchIndex, direction);
  };

  const handleReplace = async (replaceAll: boolean = false) => {
    if (!searchText.trim()) {
      toast({
        title: "Search text required",
        description: "Please enter text to search for before replacing.",
        variant: "destructive"
      });
      return;
    }

    if (!replaceText.trim()) {
      toast({
        title: "Replace text required", 
        description: "Please enter replacement text.",
        variant: "destructive"
      });
      return;
    }

    try {
      let result;
      
      if (replaceAll) {
        result = await replaceAllMatches(searchText, replaceText);
      } else {
        if (currentMatchIndex === -1 || matches.length === 0) {
          toast({
            title: "No match selected",
            description: "Please select a match to replace.",
            variant: "destructive"
          });
          return;
        }
        
        const currentMatch = matches[currentMatchIndex];
        result = await replaceInCurrentMatch(
          searchText, 
          replaceText, 
          currentMatch.itemId, 
          currentMatch.field
        );
      }

      if (result.success) {
        const count = result.replacements.length;
        toast({
          title: "Replacement successful",
          description: `${count} replacement${count !== 1 ? 's' : ''} made.`
        });

        // Refresh search results after replacement
        setTimeout(() => {
          performSearch(searchText);
        }, 100);
      } else {
        toast({
          title: "Replacement failed",
          description: result.errors.join(', '),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Replace error:', error);
      toast({
        title: "Replacement error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchText('');
    setReplaceText('');
    setShowReplace(false);
    clearLastResult();
    // Clear highlights when closing
    onHighlightMatch('', '', 0, 0);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
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
            isReplacing={isReplacing}
          />
        )}

        <SearchControls
          currentMatchIndex={currentMatchIndex}
          totalMatches={matches.length}
          onNavigate={handleNavigate}
        />

        {searchText && matches.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No matches found
          </div>
        )}

        {lastReplaceResult && lastReplaceResult.errors.length > 0 && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {lastReplaceResult.errors.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
