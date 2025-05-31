
import React, { useState } from 'react';
import { Search, MoreHorizontal, ChevronUp, ChevronDown, X, Replace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSearchAndReplace } from '@/hooks/useSearchAndReplace';
import { RundownItem } from '@/hooks/useRundownItems';

interface SearchBarProps {
  items: RundownItem[];
  onUpdateItem: (id: string, field: string, value: string) => void;
}

const SearchBar = ({ items, onUpdateItem }: SearchBarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    searchTerm,
    setSearchTerm,
    replaceTerm,
    setReplaceTerm,
    matches,
    currentMatchIndex,
    isReplaceMode,
    setIsReplaceMode,
    isCaseSensitive,
    setIsCaseSensitive,
    goToNextMatch,
    goToPreviousMatch,
    replaceCurrentMatch,
    replaceAllMatches,
    clearSearch
  } = useSearchAndReplace(items, onUpdateItem);

  const handleSearchClick = () => {
    setIsExpanded(true);
  };

  const handleClose = () => {
    setIsExpanded(false);
    clearSearch();
  };

  if (!isExpanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSearchClick}
        className="text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border rounded-md px-3 py-1 shadow-sm">
      <div className="flex items-center gap-1">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-40 h-8 border-0 px-2 focus-visible:ring-0"
        />
      </div>

      {searchTerm && matches.length > 0 && (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <span>{currentMatchIndex + 1} of {matches.length}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousMatch}
            className="h-6 w-6 p-0"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMatch}
            className="h-6 w-6 p-0"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Search Options</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplaceMode(!isReplaceMode)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Replace className="h-4 w-4 mr-1" />
                {isReplaceMode ? 'Hide Replace' : 'Find & Replace'}
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="case-sensitive"
                checked={isCaseSensitive}
                onCheckedChange={(checked) => setIsCaseSensitive(checked === true)}
              />
              <label
                htmlFor="case-sensitive"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Case sensitive
              </label>
            </div>

            {isReplaceMode && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Replace with:</label>
                  <Input
                    placeholder="Replace with..."
                    value={replaceTerm}
                    onChange={(e) => setReplaceTerm(e.target.value)}
                    className="h-8"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={replaceCurrentMatch}
                    disabled={!matches.length || !replaceTerm}
                    className="flex-1"
                  >
                    Replace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={replaceAllMatches}
                    disabled={!matches.length || !replaceTerm}
                    className="flex-1"
                  >
                    Replace All
                  </Button>
                </div>
              </div>
            )}

            {searchTerm && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {matches.length === 0 ? 'No matches found' : `${matches.length} matches found`}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleClose}
        className="h-6 w-6 p-0"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default SearchBar;
