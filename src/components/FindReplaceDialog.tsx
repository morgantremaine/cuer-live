
import React, { useEffect, useRef } from 'react';
import { Search, Replace, ChevronUp, ChevronDown, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

interface FindReplaceDialogProps {
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
  trigger: React.ReactNode;
}

export const FindReplaceDialog = ({
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
  onReset,
  trigger
}: FindReplaceDialogProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  // Focus search input when dialog opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure the popover is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 100);
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
        e.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNextMatch, onPreviousMatch]);

  const hasMatches = matchCount > 0;
  const hasSearchTerm = searchTerm.trim().length > 0;
  const canReplace = hasMatches && replaceTerm.trim().length > 0;

  const handleClose = () => {
    setIsOpen(false);
    onReset();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-4" 
        align="end" 
        side="bottom"
        sideOffset={8}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="font-semibold">Find & Replace</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Section */}
          <div className="space-y-2">
            <Label htmlFor="search-input" className="text-sm">Find</Label>
            <div className="flex gap-1">
              <Input
                id="search-input"
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                placeholder="Enter search term..."
                className="flex-1 h-8"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onPreviousMatch}
                disabled={!hasMatches}
                title="Previous match (Shift+Enter)"
                className="h-8 w-8 p-0"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onNextMatch}
                disabled={!hasMatches}
                title="Next match (Enter)"
                className="h-8 w-8 p-0"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Match counter */}
            <div className="text-xs text-muted-foreground">
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
            <Label htmlFor="replace-input" className="text-sm">Replace with</Label>
            <Input
              id="replace-input"
              value={replaceTerm}
              onChange={(e) => onReplaceTermChange(e.target.value)}
              placeholder="Enter replacement text..."
              className="h-8"
            />
            
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onReplaceCurrent}
                disabled={!canReplace}
                title="Replace current match"
                className="h-8 text-xs"
              >
                <Replace className="h-3 w-3 mr-1" />
                Replace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onReplaceAll}
                disabled={!canReplace}
                title="Replace all matches"
                className="h-8 text-xs"
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
                className="scale-75"
              />
              <Label htmlFor="case-sensitive" className="text-xs">
                Case sensitive
              </Label>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              title="Clear all"
              className="h-8 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
