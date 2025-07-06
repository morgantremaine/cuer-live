import React, { useState, useEffect, useRef } from 'react';
import { Search, Replace, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useFindReplace } from '@/hooks/useFindReplace';

interface FindReplaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem?: (id: string, field: string, value: string) => void;
}

const FindReplaceDialog = ({ isOpen, onClose, onUpdateItem }: FindReplaceDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [showReplace, setShowReplace] = useState(false);
  const { findMatches, replaceAll, lastSearchResults } = useFindReplace(onUpdateItem);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fields to search in
  const searchFields = ['name', 'script', 'talent', 'notes', 'customFields.location', 'customFields.graphics'];

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm.trim()) {
      findMatches({
        searchTerm,
        replaceTerm: '',
        fields: searchFields,
        caseSensitive: false,
        wholeWord: false
      });
      setCurrentMatchIndex(0);
    }
  }, [searchTerm]);

  const handleSearch = () => {
    if (searchTerm.trim()) {
      findMatches({
        searchTerm,
        replaceTerm: '',
        fields: searchFields,
        caseSensitive: false,
        wholeWord: false
      });
      setCurrentMatchIndex(0);
    }
  };

  const handleReplace = () => {
    if (searchTerm.trim() && replaceTerm.trim()) {
      replaceAll({
        searchTerm,
        replaceTerm,
        fields: searchFields,
        caseSensitive: false,
        wholeWord: false
      });
      // Clear search after replace
      setSearchTerm('');
      setReplaceTerm('');
      setCurrentMatchIndex(0);
    }
  };

  const navigateToMatch = (direction: 'next' | 'prev') => {
    if (lastSearchResults.matches.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = currentMatchIndex >= lastSearchResults.matches.length - 1 ? 0 : currentMatchIndex + 1;
    } else {
      newIndex = currentMatchIndex <= 0 ? lastSearchResults.matches.length - 1 : currentMatchIndex - 1;
    }
    
    setCurrentMatchIndex(newIndex);
    
    // Scroll to the matched item
    const currentMatch = lastSearchResults.matches[newIndex];
    if (currentMatch) {
      const element = document.querySelector(`[data-item-id="${currentMatch.itemId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add temporary highlight
        element.classList.add('bg-yellow-200', 'dark:bg-yellow-800');
        setTimeout(() => {
          element.classList.remove('bg-yellow-200', 'dark:bg-yellow-800');
        }, 2000);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      navigateToMatch('prev');
    } else if (e.key === 'Enter') {
      navigateToMatch('next');
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50 flex items-start justify-center pt-20">
      <Card className="w-96 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="font-medium">Find & Replace</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  ref={searchInputRef}
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSearch}
                  className="px-3"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              {lastSearchResults.totalMatches > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {lastSearchResults.totalMatches} matches
                    </Badge>
                    {lastSearchResults.matches.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {currentMatchIndex + 1} of {lastSearchResults.matches.length}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToMatch('prev')}
                      disabled={lastSearchResults.matches.length === 0}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToMatch('next')}
                      disabled={lastSearchResults.matches.length === 0}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {!showReplace && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplace(true)}
                className="w-full justify-start"
              >
                <Replace className="h-4 w-4 mr-2" />
                Show Replace
              </Button>
            )}

            {showReplace && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Replace with..."
                      value={replaceTerm}
                      onChange={(e) => setReplaceTerm(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReplace}
                      disabled={!searchTerm.trim() || !replaceTerm.trim()}
                      className="px-3"
                    >
                      Replace All
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReplace(false)}
                    className="w-full justify-start text-muted-foreground"
                  >
                    Hide Replace
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            <div>Enter: Next match • Shift+Enter: Previous match</div>
            <div>Searching: Name, Script, Talent, Notes, Location, Graphics</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FindReplaceDialog;