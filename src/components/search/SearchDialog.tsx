
import React, { useState, useCallback } from 'react';
import { Search, X, ChevronUp, ChevronDown, Replace, ReplaceAll } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSearchLogic } from '@/hooks/useSearchLogic';
import { RundownItem } from '@/types/rundown';
import { useToast } from '@/hooks/use-toast';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: RundownItem[];
  onUpdateItem: (itemId: string, field: string, value: string) => void;
}

export const SearchDialog = ({ isOpen, onClose, items, onUpdateItem }: SearchDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const { toast } = useToast();
  
  const {
    searchState,
    performSearch,
    nextMatch,
    previousMatch,
    updateOptions,
    setReplaceTerm,
    clearSearch
  } = useSearchLogic(items);

  const handleSearch = useCallback(() => {
    if (searchTerm.trim()) {
      performSearch(searchTerm);
    }
  }, [searchTerm, performSearch]);

  const handleReplaceOne = useCallback(() => {
    if (searchState.currentMatchIndex >= 0 && searchState.matches.length > 0) {
      const currentMatch = searchState.matches[searchState.currentMatchIndex];
      const item = items.find(i => i.id === currentMatch.itemId);
      
      if (item) {
        const fieldValue = item[currentMatch.field as keyof RundownItem] as string || '';
        const newValue = fieldValue.substring(0, currentMatch.startPos) + 
                        searchState.replaceTerm + 
                        fieldValue.substring(currentMatch.endPos);
        
        onUpdateItem(currentMatch.itemId, currentMatch.field, newValue);
        
        // Re-search to update match positions
        setTimeout(() => performSearch(searchState.searchTerm), 100);
        
        toast({
          title: "Replaced",
          description: `Replaced 1 instance in ${currentMatch.field} field`,
        });
      }
    }
  }, [searchState, items, onUpdateItem, performSearch, toast]);

  const handleReplaceAll = useCallback(() => {
    if (searchState.matches.length === 0) return;

    let replacedCount = 0;
    const updatedItems = new Map<string, Map<string, string>>();

    // Group matches by item and field
    searchState.matches.forEach(match => {
      if (!updatedItems.has(match.itemId)) {
        updatedItems.set(match.itemId, new Map());
      }
      updatedItems.get(match.itemId)!.set(match.field, match.field);
    });

    // Process each item and field
    updatedItems.forEach((fields, itemId) => {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      fields.forEach((_, field) => {
        const fieldValue = item[field as keyof RundownItem] as string || '';
        const searchRegex = searchState.wholeWords 
          ? new RegExp(`\\b${searchState.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, searchState.caseSensitive ? 'g' : 'gi')
          : new RegExp(searchState.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), searchState.caseSensitive ? 'g' : 'gi');
        
        const newValue = fieldValue.replace(searchRegex, searchState.replaceTerm);
        if (newValue !== fieldValue) {
          onUpdateItem(itemId, field, newValue);
          replacedCount += (fieldValue.match(searchRegex) || []).length;
        }
      });
    });

    // Re-search to update matches
    setTimeout(() => performSearch(searchState.searchTerm), 100);

    toast({
      title: "Replace All Complete",
      description: `Replaced ${replacedCount} instances`,
    });
  }, [searchState, items, onUpdateItem, performSearch, toast]);

  const handleClose = useCallback(() => {
    clearSearch();
    setSearchTerm('');
    setShowReplace(false);
    onClose();
  }, [clearSearch, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find{showReplace ? ' & Replace' : ''}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Search in rundown..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} size="sm">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Replace Input (if shown) */}
          {showReplace && (
            <Input
              placeholder="Replace with..."
              value={searchState.replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
            />
          )}

          {/* Search Results */}
          {searchState.matches.length > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {searchState.currentMatchIndex + 1} of {searchState.matches.length} matches
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousMatch}
                  disabled={searchState.matches.length === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextMatch}
                  disabled={searchState.matches.length === 0}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={searchState.caseSensitive}
                onCheckedChange={(checked) => updateOptions({ caseSensitive: !!checked })}
              />
              Case sensitive
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={searchState.wholeWords}
                onCheckedChange={(checked) => updateOptions({ wholeWords: !!checked })}
              />
              Whole words
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReplace(!showReplace)}
              className="flex-1"
            >
              {showReplace ? 'Hide Replace' : 'Show Replace'}
            </Button>
            
            {showReplace && (
              <>
                <Button
                  onClick={handleReplaceOne}
                  disabled={searchState.currentMatchIndex < 0}
                  size="sm"
                >
                  <Replace className="h-4 w-4 mr-1" />
                  Replace
                </Button>
                <Button
                  onClick={handleReplaceAll}
                  disabled={searchState.matches.length === 0}
                  size="sm"
                >
                  <ReplaceAll className="h-4 w-4 mr-1" />
                  All
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
