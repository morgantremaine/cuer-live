
import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronUp, Replace } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface SearchResult {
  itemId: string;
  itemName: string;
  fieldKey: string;
  fieldName: string;
  matchText: string;
  startIndex: number;
  endIndex: number;
}

interface FindReplaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: RundownItem[];
  columns: Column[];
  onUpdateItem: (id: string, field: string, value: string) => void;
  onHighlightItem?: (itemId: string) => void;
  onScrollToItem?: (itemId: string) => void;
}

const FindReplaceDialog = ({
  isOpen,
  onClose,
  items,
  columns,
  onUpdateItem,
  onHighlightItem,
  onScrollToItem
}: FindReplaceDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [showReplace, setShowReplace] = useState(false);

  // Search in specific fields
  const [searchFields, setSearchFields] = useState({
    name: true,
    script: true,
    notes: true,
    talent: true,
    gfx: true,
    video: true
  });

  // Perform search across rundown items
  const searchResults = useMemo((): SearchResult[] => {
    if (!searchTerm.trim()) return [];

    const results: SearchResult[] = [];
    const searchValue = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    items.forEach(item => {
      // Search in selected fields
      Object.entries(searchFields).forEach(([fieldKey, shouldSearch]) => {
        if (!shouldSearch) return;

        let fieldValue = '';
        let fieldName = fieldKey;

        // Get field value
        switch (fieldKey) {
          case 'name':
            fieldValue = item.name || '';
            fieldName = 'Segment Name';
            break;
          case 'script':
            fieldValue = item.script || '';
            fieldName = 'Script';
            break;
          case 'notes':
            fieldValue = item.notes || '';
            fieldName = 'Notes';
            break;
          case 'talent':
            fieldValue = item.talent || '';
            fieldName = 'Talent';
            break;
          case 'gfx':
            fieldValue = item.gfx || '';
            fieldName = 'GFX';
            break;
          case 'video':
            fieldValue = item.video || '';
            fieldName = 'Video';
            break;
        }

        if (!fieldValue) return;

        const searchInValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();
        let startIndex = 0;

        // Find all matches in this field
        while (true) {
          const matchIndex = searchInValue.indexOf(searchValue, startIndex);
          if (matchIndex === -1) break;

          results.push({
            itemId: item.id,
            itemName: item.name || 'Untitled',
            fieldKey,
            fieldName,
            matchText: fieldValue.substring(matchIndex, matchIndex + searchTerm.length),
            startIndex: matchIndex,
            endIndex: matchIndex + searchTerm.length
          });

          startIndex = matchIndex + 1;
        }
      });
    });

    return results;
  }, [searchTerm, caseSensitive, items, searchFields]);

  // Reset current result when search changes
  useEffect(() => {
    setCurrentResultIndex(0);
  }, [searchResults]);

  // Navigate to current result
  useEffect(() => {
    if (searchResults.length > 0 && onScrollToItem) {
      const currentResult = searchResults[currentResultIndex];
      if (currentResult) {
        onScrollToItem(currentResult.itemId);
        if (onHighlightItem) {
          onHighlightItem(currentResult.itemId);
        }
      }
    }
  }, [currentResultIndex, searchResults, onScrollToItem, onHighlightItem]);

  const handlePrevious = () => {
    if (searchResults.length > 0) {
      setCurrentResultIndex(prev => 
        prev === 0 ? searchResults.length - 1 : prev - 1
      );
    }
  };

  const handleNext = () => {
    if (searchResults.length > 0) {
      setCurrentResultIndex(prev => 
        prev === searchResults.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handleReplace = () => {
    if (searchResults.length === 0) return;

    const currentResult = searchResults[currentResultIndex];
    if (!currentResult) return;

    const item = items.find(i => i.id === currentResult.itemId);
    if (!item) return;

    // Get current field value
    let currentValue = '';
    switch (currentResult.fieldKey) {
      case 'name':
        currentValue = item.name || '';
        break;
      case 'script':
        currentValue = item.script || '';
        break;
      case 'notes':
        currentValue = item.notes || '';
        break;
      case 'talent':
        currentValue = item.talent || '';
        break;
      case 'gfx':
        currentValue = item.gfx || '';
        break;
      case 'video':
        currentValue = item.video || '';
        break;
    }

    // Replace the specific match
    const newValue = 
      currentValue.substring(0, currentResult.startIndex) +
      replaceTerm +
      currentValue.substring(currentResult.endIndex);

    onUpdateItem(currentResult.itemId, currentResult.fieldKey, newValue);
  };

  const handleReplaceAll = () => {
    if (!searchTerm.trim() || !replaceTerm.trim()) return;

    const replacements = new Map<string, Map<string, string>>();

    // Group replacements by item and field
    searchResults.forEach(result => {
      if (!replacements.has(result.itemId)) {
        replacements.set(result.itemId, new Map());
      }
      
      const itemReplacements = replacements.get(result.itemId)!;
      if (!itemReplacements.has(result.fieldKey)) {
        const item = items.find(i => i.id === result.itemId);
        if (item) {
          let currentValue = '';
          switch (result.fieldKey) {
            case 'name':
              currentValue = item.name || '';
              break;
            case 'script':
              currentValue = item.script || '';
              break;
            case 'notes':
              currentValue = item.notes || '';
              break;
            case 'talent':
              currentValue = item.talent || '';
              break;
            case 'gfx':
              currentValue = item.gfx || '';
              break;
            case 'video':
              currentValue = item.video || '';
              break;
          }
          itemReplacements.set(result.fieldKey, currentValue);
        }
      }
    });

    // Apply all replacements
    replacements.forEach((fieldMap, itemId) => {
      fieldMap.forEach((originalValue, fieldKey) => {
        const searchValue = caseSensitive ? searchTerm : searchTerm.toLowerCase();
        const originalForSearch = caseSensitive ? originalValue : originalValue.toLowerCase();
        
        let newValue = originalValue;
        let lastIndex = 0;
        let result = '';
        
        while (true) {
          const matchIndex = originalForSearch.indexOf(searchValue, lastIndex);
          if (matchIndex === -1) {
            result += originalValue.substring(lastIndex);
            break;
          }
          
          result += originalValue.substring(lastIndex, matchIndex) + replaceTerm;
          lastIndex = matchIndex + searchTerm.length;
        }
        
        if (result !== originalValue) {
          onUpdateItem(itemId, fieldKey, result);
        }
      });
    });
  };

  const handleFieldToggle = (field: string, checked: boolean | "indeterminate") => {
    if (checked !== "indeterminate") {
      setSearchFields(prev => ({
        ...prev,
        [field]: checked
      }));
    }
  };

  const handleCaseSensitiveChange = (checked: boolean | "indeterminate") => {
    if (checked !== "indeterminate") {
      setCaseSensitive(checked);
    }
  };

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
          {/* Search Input */}
          <div className="space-y-2">
            <Input
              placeholder="Find..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Replace Input */}
          {showReplace && (
            <div className="space-y-2">
              <Input
                placeholder="Replace with..."
                value={replaceTerm}
                onChange={e => setReplaceTerm(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          {/* Search Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="case-sensitive"
                checked={caseSensitive}
                onCheckedChange={handleCaseSensitiveChange}
              />
              <label htmlFor="case-sensitive" className="text-sm">
                Case sensitive
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search in:</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(searchFields).map(([field, checked]) => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={field}
                      checked={checked}
                      onCheckedChange={(checked) => handleFieldToggle(field, checked)}
                    />
                    <label htmlFor={field} className="text-sm capitalize">
                      {field === 'name' ? 'Segment Name' : field}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          {searchTerm && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {searchResults.length > 0 
                  ? `${currentResultIndex + 1} of ${searchResults.length} results`
                  : 'No results found'
                }
              </span>
              {searchResults.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={searchResults.length === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNext}
                    disabled={searchResults.length === 0}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Current Result Info */}
          {searchResults.length > 0 && (
            <div className="p-2 bg-gray-50 rounded-md text-sm">
              <div className="font-medium">{searchResults[currentResultIndex]?.itemName}</div>
              <div className="text-gray-600">{searchResults[currentResultIndex]?.fieldName}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReplace(!showReplace)}
            >
              <Replace className="h-4 w-4 mr-2" />
              {showReplace ? 'Hide Replace' : 'Show Replace'}
            </Button>

            {showReplace && (
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReplace}
                  disabled={searchResults.length === 0 || !replaceTerm.trim()}
                >
                  Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReplaceAll}
                  disabled={searchResults.length === 0 || !replaceTerm.trim()}
                >
                  Replace All
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FindReplaceDialog;
