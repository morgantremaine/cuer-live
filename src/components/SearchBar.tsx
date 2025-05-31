
import React, { useState, useRef, useEffect } from 'react';
import { Search, MoreHorizontal, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SearchMatch {
  itemId: string;
  field: string;
  index: number;
  length: number;
}

interface SearchBarProps {
  items: any[];
  visibleColumns: any[];
  onHighlightMatch: (itemId: string, field: string, startIndex: number, endIndex: number) => void;
  onReplaceText: (itemId: string, field: string, searchText: string, replaceText: string, replaceAll: boolean) => void;
}

const SearchBar = ({ items, visibleColumns, onHighlightMatch, onReplaceText }: SearchBarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search through all cells
  const performSearch = (text: string) => {
    if (!text.trim()) {
      setMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const foundMatches: SearchMatch[] = [];
    const searchLower = text.toLowerCase();

    items.forEach((item) => {
      if (item.type === 'header') return;

      visibleColumns.forEach((column) => {
        const cellValue = item[column.id] || '';
        const cellValueLower = cellValue.toLowerCase();
        let index = 0;

        while (index < cellValue.length) {
          const foundIndex = cellValueLower.indexOf(searchLower, index);
          if (foundIndex === -1) break;

          foundMatches.push({
            itemId: item.id,
            field: column.id,
            index: foundIndex,
            length: text.length
          });

          index = foundIndex + 1;
        }
      });
    });

    setMatches(foundMatches);
    if (foundMatches.length > 0) {
      setCurrentMatchIndex(0);
      const firstMatch = foundMatches[0];
      onHighlightMatch(firstMatch.itemId, firstMatch.field, firstMatch.index, firstMatch.index + firstMatch.length);
    } else {
      setCurrentMatchIndex(-1);
    }
  };

  const navigateMatch = (direction: 'next' | 'prev') => {
    if (matches.length === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = currentMatchIndex < matches.length - 1 ? currentMatchIndex + 1 : 0;
    } else {
      newIndex = currentMatchIndex > 0 ? currentMatchIndex - 1 : matches.length - 1;
    }

    setCurrentMatchIndex(newIndex);
    const match = matches[newIndex];
    onHighlightMatch(match.itemId, match.field, match.index, match.index + match.length);
  };

  const handleReplace = (replaceAll: boolean = false) => {
    if (!searchText.trim() || currentMatchIndex === -1) return;

    const currentMatch = matches[currentMatchIndex];
    onReplaceText(currentMatch.itemId, currentMatch.field, searchText, replaceText, replaceAll);

    // Refresh search after replace
    setTimeout(() => {
      performSearch(searchText);
    }, 100);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchText('');
    setReplaceText('');
    setShowReplace(false);
    setMatches([]);
    setCurrentMatchIndex(-1);
  };

  useEffect(() => {
    performSearch(searchText);
  }, [searchText, items]);

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
          <div className="flex-1 relative">
            <Input
              ref={searchInputRef}
              placeholder="Search in rundown..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pr-8"
            />
            <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
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
          <Input
            placeholder="Replace with..."
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
          />
        )}

        {matches.length > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {currentMatchIndex + 1} of {matches.length} matches
            </span>
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="sm" onClick={() => navigateMatch('prev')}>
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigateMatch('next')}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {showReplace && matches.length > 0 && (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleReplace(false)}>
              Replace
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleReplace(true)}>
              Replace All
            </Button>
          </div>
        )}

        {searchText && matches.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No matches found
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
