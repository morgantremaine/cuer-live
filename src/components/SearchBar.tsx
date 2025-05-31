
import React, { useRef, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, MoreHorizontal, X, Replace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SearchBarProps {
  searchTerm: string;
  replaceTerm: string;
  currentMatchIndex: number;
  totalMatches: number;
  caseSensitive: boolean;
  showReplaceOptions: boolean;
  onSearchTermChange: (term: string) => void;
  onReplaceTermChange: (term: string) => void;
  onCaseSensitiveChange: (checked: boolean) => void;
  onShowReplaceOptionsChange: (show: boolean) => void;
  onNextMatch: () => void;
  onPreviousMatch: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  onClearSearch: () => void;
}

const SearchBar = ({
  searchTerm,
  replaceTerm,
  currentMatchIndex,
  totalMatches,
  caseSensitive,
  showReplaceOptions,
  onSearchTermChange,
  onReplaceTermChange,
  onCaseSensitiveChange,
  onShowReplaceOptionsChange,
  onNextMatch,
  onPreviousMatch,
  onReplaceCurrent,
  onReplaceAll,
  onClearSearch
}: SearchBarProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        onPreviousMatch();
      } else {
        onNextMatch();
      }
    } else if (e.key === 'Escape') {
      onClearSearch();
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5">
        <Search className="h-4 w-4 text-gray-400" />
        <Input
          ref={searchInputRef}
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          className="border-none bg-transparent focus:ring-0 focus:border-none shadow-none px-1 h-auto py-0"
        />
        
        {searchTerm && (
          <>
            <div className="text-xs text-gray-500 px-2 border-l border-gray-300 dark:border-gray-600">
              {totalMatches > 0 ? `${currentMatchIndex + 1} of ${totalMatches}` : '0 of 0'}
            </div>
            
            <div className="flex items-center border-l border-gray-300 dark:border-gray-600 pl-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPreviousMatch}
                disabled={totalMatches === 0}
                className="h-6 w-6 p-0"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNextMatch}
                disabled={totalMatches === 0}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white dark:bg-gray-700">
            <DropdownMenuItem
              onClick={() => onShowReplaceOptionsChange(!showReplaceOptions)}
              className="flex items-center gap-2"
            >
              <Replace className="h-4 w-4" />
              Find and Replace
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="case-sensitive"
                  checked={caseSensitive}
                  onCheckedChange={onCaseSensitiveChange}
                />
                <label htmlFor="case-sensitive" className="text-sm">
                  Case sensitive
                </label>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSearch}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {showReplaceOptions && (
        <Popover open={showReplaceOptions} onOpenChange={onShowReplaceOptionsChange}>
          <PopoverTrigger asChild>
            <div />
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Replace with:</label>
                <Input
                  value={replaceTerm}
                  onChange={(e) => onReplaceTermChange(e.target.value)}
                  placeholder="Replacement text..."
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReplaceCurrent}
                  disabled={totalMatches === 0 || !replaceTerm}
                >
                  Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReplaceAll}
                  disabled={totalMatches === 0 || !replaceTerm}
                >
                  Replace All ({totalMatches})
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default SearchBar;
