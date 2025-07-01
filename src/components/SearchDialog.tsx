
import React, { useEffect, useRef } from 'react';
import { Search, X, ChevronUp, ChevronDown, Replace, ReplaceAll } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface SearchDialogProps {
  isOpen: boolean;
  searchQuery: string;
  replaceQuery: string;
  matchCount: number;
  currentMatchIndex: number;
  searchOptions: {
    caseSensitive: boolean;
    wholeWords: boolean;
    regex: boolean;
  };
  onClose: () => void;
  onSearchChange: (query: string) => void;
  onReplaceChange: (query: string) => void;
  onOptionsChange: (options: any) => void;
  onNextMatch: () => void;
  onPreviousMatch: () => void;
  onReplaceCurrentMatch: () => void;
  onReplaceAllMatches: () => void;
}

const SearchDialog = ({
  isOpen,
  searchQuery,
  replaceQuery,
  matchCount,
  currentMatchIndex,
  searchOptions,
  onClose,
  onSearchChange,
  onReplaceChange,
  onOptionsChange,
  onNextMatch,
  onPreviousMatch,
  onReplaceCurrentMatch,
  onReplaceAllMatches
}: SearchDialogProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showReplace, setShowReplace] = React.useState(false);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) {
          onPreviousMatch();
        } else {
          onNextMatch();
        }
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        if (showReplace) {
          onReplaceCurrentMatch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNextMatch, onPreviousMatch, onReplaceCurrentMatch, showReplace]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
      <Card className="w-full max-w-2xl mx-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-medium">Search & Replace</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Input */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Input
                  ref={searchInputRef}
                  placeholder="Search in rundown..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                  <span className="text-xs text-muted-foreground">
                    {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : '0/0'}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={onPreviousMatch}
                disabled={matchCount === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onNextMatch}
                disabled={matchCount === 0}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Replace Section */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplace(!showReplace)}
                  className="text-muted-foreground"
                >
                  {showReplace ? 'Hide Replace' : 'Show Replace'}
                </Button>
              </div>

              {showReplace && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Replace with..."
                      value={replaceQuery}
                      onChange={(e) => onReplaceChange(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          onReplaceCurrentMatch();
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={onReplaceCurrentMatch}
                      disabled={matchCount === 0}
                      title="Replace Current (Ctrl+Enter)"
                    >
                      <Replace className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={onReplaceAllMatches}
                      disabled={matchCount === 0}
                      title="Replace All"
                    >
                      <ReplaceAll className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Search Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Search Options</h4>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="case-sensitive"
                    checked={searchOptions.caseSensitive}
                    onCheckedChange={(checked) =>
                      onOptionsChange({ ...searchOptions, caseSensitive: !!checked })
                    }
                  />
                  <label htmlFor="case-sensitive" className="text-sm">
                    Case sensitive
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="whole-words"
                    checked={searchOptions.wholeWords}
                    onCheckedChange={(checked) =>
                      onOptionsChange({ ...searchOptions, wholeWords: !!checked })
                    }
                  />
                  <label htmlFor="whole-words" className="text-sm">
                    Whole words
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="regex"
                    checked={searchOptions.regex}
                    onCheckedChange={(checked) =>
                      onOptionsChange({ ...searchOptions, regex: !!checked })
                    }
                  />
                  <label htmlFor="regex" className="text-sm">
                    Regular expression
                  </label>
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+F</kbd> Open search</p>
              <p><kbd className="px-1 py-0.5 bg-muted rounded">F3</kbd> Next match</p>
              <p><kbd className="px-1 py-0.5 bg-muted rounded">Shift+F3</kbd> Previous match</p>
              <p><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Enter</kbd> Replace current</p>
              <p><kbd className="px-1 py-0.5 bg-muted rounded">Escape</kbd> Close search</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchDialog;
