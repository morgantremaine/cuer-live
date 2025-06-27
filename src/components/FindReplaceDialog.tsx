
import React, { useEffect, useRef } from 'react';
import { Search, Replace, ChevronUp, ChevronDown, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface FindReplaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  replaceTerm: string;
  caseSensitive: boolean;
  currentMatchIndex: number;
  matchCount: number;
  onSearchTermChange: (term: string) => void;
  onReplaceTermChange: (term: string) => void;
  onCaseSensitiveChange: (enabled: boolean) => void;
  onNextMatch: () => void;
  onPreviousMatch: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  onReset: () => void;
}

export const FindReplaceDialog = ({
  isOpen,
  onClose,
  searchTerm,
  replaceTerm,
  caseSensitive,
  currentMatchIndex,
  matchCount,
  onSearchTermChange,
  onReplaceTermChange,
  onCaseSensitiveChange,
  onNextMatch,
  onPreviousMatch,
  onReplaceCurrent,
  onReplaceAll,
  onReset
}: FindReplaceDialogProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when dialog opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onNextMatch();
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        onPreviousMatch();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNextMatch, onPreviousMatch, onClose]);

  const hasMatches = matchCount > 0;
  const hasSearchTerm = searchTerm.trim().length > 0;
  const canReplace = hasMatches && replaceTerm.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find & Replace
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Section */}
          <div className="space-y-2">
            <Label htmlFor="search-input">Find</Label>
            <div className="flex gap-2">
              <Input
                id="search-input"
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                placeholder="Enter search term..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onPreviousMatch}
                disabled={!hasMatches}
                title="Previous match (Shift+Enter)"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onNextMatch}
                disabled={!hasMatches}
                title="Next match (Enter)"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Match counter */}
            <div className="text-sm text-muted-foreground">
              {hasSearchTerm ? (
                hasMatches ? (
                  `${currentMatchIndex + 1} of ${matchCount} matches`
                ) : (
                  'No matches found'
                )
              ) : (
                'Enter text to search'
              )}
            </div>
          </div>

          <Separator />

          {/* Replace Section */}
          <div className="space-y-2">
            <Label htmlFor="replace-input">Replace with</Label>
            <Input
              id="replace-input"
              value={replaceTerm}
              onChange={(e) => onReplaceTermChange(e.target.value)}
              placeholder="Enter replacement text..."
            />
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onReplaceCurrent}
                disabled={!canReplace}
                title="Replace current match"
              >
                <Replace className="h-4 w-4 mr-1" />
                Replace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onReplaceAll}
                disabled={!canReplace}
                title="Replace all matches"
              >
                Replace All
              </Button>
            </div>
          </div>

          <Separator />

          {/* Options & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="case-sensitive"
                checked={caseSensitive}
                onCheckedChange={onCaseSensitiveChange}
              />
              <Label htmlFor="case-sensitive" className="text-sm">
                Case sensitive
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                title="Clear all"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                title="Close (Escape)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
