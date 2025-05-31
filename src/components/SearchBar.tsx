
import React, { useState } from 'react';
import { Search, MoreVertical, ChevronUp, ChevronDown, Replace, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

interface SearchBarProps {
  searchTerm: string;
  replaceTerm: string;
  currentMatchIndex: number;
  totalMatches: number;
  isReplaceMode: boolean;
  isCaseSensitive: boolean;
  onSearchTermChange: (term: string) => void;
  onReplaceTermChange: (term: string) => void;
  onToggleReplaceMode: (enabled: boolean) => void;
  onToggleCaseSensitive: (enabled: boolean) => void;
  onNextMatch: () => void;
  onPreviousMatch: () => void;
  onReplaceCurrentMatch: () => void;
  onReplaceAllMatches: () => void;
  onClearSearch: () => void;
}

const SearchBar = ({
  searchTerm,
  replaceTerm,
  currentMatchIndex,
  totalMatches,
  isReplaceMode,
  isCaseSensitive,
  onSearchTermChange,
  onReplaceTermChange,
  onToggleReplaceMode,
  onToggleCaseSensitive,
  onNextMatch,
  onPreviousMatch,
  onReplaceCurrentMatch,
  onReplaceAllMatches,
  onClearSearch
}: SearchBarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 p-2 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-1 flex-1 max-w-md">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          type="text"
          placeholder="Search in rundown..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="flex-1 h-8"
        />
        
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSearch}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {searchTerm && (
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-600">
            {totalMatches > 0 ? `${currentMatchIndex} of ${totalMatches}` : 'No matches'}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreviousMatch}
            disabled={totalMatches === 0}
            className="h-8 w-8 p-0"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onNextMatch}
            disabled={totalMatches === 0}
            className="h-8 w-8 p-0"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 bg-white border border-gray-200" align="end">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="case-sensitive"
                checked={isCaseSensitive}
                onCheckedChange={onToggleCaseSensitive}
              />
              <label htmlFor="case-sensitive" className="text-sm">
                Case sensitive
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="replace-mode"
                checked={isReplaceMode}
                onCheckedChange={onToggleReplaceMode}
              />
              <label htmlFor="replace-mode" className="text-sm">
                Find and replace
              </label>
            </div>

            {isReplaceMode && (
              <div className="space-y-3 pt-2 border-t">
                <div>
                  <label className="text-sm font-medium">Replace with:</label>
                  <Input
                    type="text"
                    placeholder="Replacement text"
                    value={replaceTerm}
                    onChange={(e) => onReplaceTermChange(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReplaceCurrentMatch}
                    disabled={totalMatches === 0 || !replaceTerm}
                    className="flex-1"
                  >
                    <Replace className="h-4 w-4 mr-1" />
                    Replace
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReplaceAllMatches}
                    disabled={totalMatches === 0 || !replaceTerm}
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Replace All
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SearchBar;
