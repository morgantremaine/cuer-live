
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Replace, ChevronUp, ChevronDown, X } from 'lucide-react';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  replaceTerm: string;
  matchCase: boolean;
  wholeWords: boolean;
  currentMatch: number;
  totalMatches: number;
  onSearchChange: (term: string) => void;
  onReplaceChange: (term: string) => void;
  onMatchCaseChange: (checked: boolean) => void;
  onWholeWordsChange: (checked: boolean) => void;
  onFindNext: () => void;
  onFindPrevious: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
}

const SearchDialog = ({
  isOpen,
  onClose,
  searchTerm,
  replaceTerm,
  matchCase,
  wholeWords,
  currentMatch,
  totalMatches,
  onSearchChange,
  onReplaceChange,
  onMatchCaseChange,
  onWholeWordsChange,
  onFindNext,
  onFindPrevious,
  onReplaceCurrent,
  onReplaceAll
}: SearchDialogProps) => {
  const [showReplace, setShowReplace] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onFindNext();
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        onFindPrevious();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onFindNext, onFindPrevious, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find {showReplace && '& Replace'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Find Input */}
          <div className="space-y-2">
            <Label htmlFor="search-input">Find</Label>
            <div className="flex gap-2">
              <Input
                id="search-input"
                placeholder="Search in rundown..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReplace(!showReplace)}
                title="Toggle Replace"
              >
                <Replace className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Replace Input */}
          {showReplace && (
            <div className="space-y-2">
              <Label htmlFor="replace-input">Replace with</Label>
              <Input
                id="replace-input"
                placeholder="Replace with..."
                value={replaceTerm}
                onChange={(e) => onReplaceChange(e.target.value)}
              />
            </div>
          )}

          {/* Search Options */}
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="match-case"
                checked={matchCase}
                onCheckedChange={onMatchCaseChange}
              />
              <Label htmlFor="match-case" className="text-sm">Match case</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="whole-words"
                checked={wholeWords}
                onCheckedChange={onWholeWordsChange}
              />
              <Label htmlFor="whole-words" className="text-sm">Whole words</Label>
            </div>
          </div>

          {/* Match Counter */}
          {searchTerm && (
            <div className="text-sm text-muted-foreground">
              {totalMatches > 0 
                ? `${currentMatch} of ${totalMatches} matches`
                : 'No matches found'
              }
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onFindPrevious}
              disabled={totalMatches === 0}
              title="Find Previous (Shift+Enter)"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onFindNext}
              disabled={totalMatches === 0}
              title="Find Next (Enter)"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            {showReplace && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReplaceCurrent}
                  disabled={totalMatches === 0}
                >
                  Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReplaceAll}
                  disabled={totalMatches === 0}
                >
                  Replace All
                </Button>
              </>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;
