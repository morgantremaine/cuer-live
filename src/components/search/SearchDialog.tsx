
import React, { useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchState, SearchActions } from '@/hooks/useRundownSearch';

interface SearchDialogProps {
  searchState: SearchState;
  actions: SearchActions;
}

const SearchDialog = ({ searchState, actions }: SearchDialogProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when dialog opens
  useEffect(() => {
    if (searchState.isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, [searchState.isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!searchState.isOpen) return;

      if (e.key === 'Escape') {
        actions.closeSearch();
        e.preventDefault();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (replaceInputRef.current === document.activeElement) {
          actions.replaceCurrentMatch();
        } else {
          actions.nextMatch();
        }
        e.preventDefault();
      } else if (e.key === 'F3') {
        if (e.shiftKey) {
          actions.previousMatch();
        } else {
          actions.nextMatch();
        }
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchState.isOpen, actions]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setQuery(e.target.value);
  };

  const handleReplaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setReplaceText(e.target.value);
  };

  const handleCaseSensitiveChange = (checked: boolean) => {
    actions.setCaseSensitive(checked);
  };

  const handleWholeWordsChange = (checked: boolean) => {
    actions.setWholeWords(checked);
  };

  return (
    <Dialog open={searchState.isOpen} onOpenChange={(open) => !open && actions.closeSearch()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Find and Replace
            <Button
              variant="ghost"
              size="sm"
              onClick={actions.closeSearch}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="search-input">Find</Label>
            <div className="flex space-x-2">
              <Input
                id="search-input"
                ref={searchInputRef}
                value={searchState.query}
                onChange={handleSearchChange}
                placeholder="Enter search term..."
                className="flex-1"
              />
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={actions.previousMatch}
                  disabled={searchState.totalMatches === 0}
                  className="p-2"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={actions.nextMatch}
                  disabled={searchState.totalMatches === 0}
                  className="p-2"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {searchState.query && (
              <div className="text-sm text-muted-foreground">
                {searchState.totalMatches > 0 
                  ? `${searchState.currentMatchIndex + 1} of ${searchState.totalMatches} matches`
                  : 'No matches found'
                }
              </div>
            )}
          </div>

          {/* Replace Input */}
          <div className="space-y-2">
            <Label htmlFor="replace-input">Replace with</Label>
            <div className="flex space-x-2">
              <Input
                id="replace-input"
                ref={replaceInputRef}
                value={searchState.replaceText}
                onChange={handleReplaceChange}
                placeholder="Enter replacement text..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={actions.replaceCurrentMatch}
                disabled={searchState.totalMatches === 0 || !searchState.replaceText}
              >
                Replace
              </Button>
            </div>
          </div>

          {/* Options */}
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="case-sensitive"
                checked={searchState.caseSensitive}
                onCheckedChange={handleCaseSensitiveChange}
              />
              <Label htmlFor="case-sensitive" className="text-sm">
                Case sensitive
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="whole-words"
                checked={searchState.wholeWords}
                onCheckedChange={handleWholeWordsChange}
              />
              <Label htmlFor="whole-words" className="text-sm">
                Whole words
              </Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={actions.replaceAllMatches}
              disabled={searchState.totalMatches === 0 || !searchState.replaceText}
            >
              Replace All
            </Button>
            <Button variant="outline" onClick={actions.closeSearch}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;
