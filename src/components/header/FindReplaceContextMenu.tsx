
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, ChevronDown, ChevronUp, Replace } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

interface FindReplaceContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: RundownItem[];
  columns: Column[];
  onUpdateItem?: (id: string, field: string, value: string) => void;
  onHighlightItem?: (itemId: string) => void;
  onScrollToItem?: (itemId: string) => void;
}

const FindReplaceContextMenu = ({
  isOpen,
  onClose,
  items,
  columns,
  onUpdateItem,
  onHighlightItem,
  onScrollToItem
}: FindReplaceContextMenuProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [showReplace, setShowReplace] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Search in specific fields
  const [searchFields, setSearchFields] = useState({
    name: true,
    script: true,
    notes: true,
    talent: true,
    gfx: true,
    video: true
  });

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Perform search across rundown items
  const searchResults = useMemo((): SearchResult[] => {
    if (!searchTerm.trim()) return [];

    const results: SearchResult[] = [];
    const searchValue = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    items.forEach(item => {
      Object.entries(searchFields).forEach(([fieldKey, shouldSearch]) => {
        if (!shouldSearch) return;

        let fieldValue = '';
        let fieldName = fieldKey;

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
    if (searchResults.length > 0 && onScrollToItem && onHighlightItem) {
      const currentResult = searchResults[currentResultIndex];
      if (currentResult) {
        onScrollToItem(currentResult.itemId);
        onHighlightItem(currentResult.itemId);
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
    if (!searchResults.length || !onUpdateItem) return;

    const currentResult = searchResults[currentResultIndex];
    if (!currentResult) return;

    const item = items.find(i => i.id === currentResult.itemId);
    if (!item) return;

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

    const newValue = 
      currentValue.substring(0, currentResult.startIndex) +
      replaceTerm +
      currentValue.substring(currentResult.endIndex);

    onUpdateItem(currentResult.itemId, currentResult.fieldKey, newValue);
  };

  const handleReplaceAll = () => {
    if (!searchTerm.trim() || !replaceTerm.trim() || !onUpdateItem) return;

    const replacements = new Map<string, Map<string, string>>();

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

    replacements.forEach((fieldMap, itemId) => {
      fieldMap.forEach((originalValue, fieldKey) => {
        const searchValue = caseSensitive ? searchTerm : searchTerm.toLowerCase();
        const originalForSearch = caseSensitive ? originalValue : originalValue.toLowerCase();
        
        let result = '';
        let lastIndex = 0;
        
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

  if (!isOpen) return null;

  return (
    <div 
      ref={menuRef}
      className="absolute top-full right-0 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <span className="text-sm font-medium">Find & Replace</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search Input */}
      <Input
        placeholder="Find..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full text-sm"
      />

      {/* Replace Input */}
      {showReplace && (
        <Input
          placeholder="Replace with..."
          value={replaceTerm}
          onChange={e => setReplaceTerm(e.target.value)}
          className="w-full text-sm"
        />
      )}

      {/* Results and Navigation */}
      {searchTerm && (
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>
            {searchResults.length > 0 
              ? `${currentResultIndex + 1} of ${searchResults.length}`
              : 'No results'
            }
          </span>
          {searchResults.length > 0 && (
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="sm" onClick={handlePrevious} className="p-1 h-6">
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNext} className="p-1 h-6">
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Current Result Info */}
      {searchResults.length > 0 && (
        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
          <div className="font-medium truncate">{searchResults[currentResultIndex]?.itemName}</div>
          <div className="text-gray-600 dark:text-gray-400">{searchResults[currentResultIndex]?.fieldName}</div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="case-sensitive"
            checked={caseSensitive}
            onCheckedChange={(checked) => setCaseSensitive(checked === true)}
          />
          <label htmlFor="case-sensitive" className="text-xs">Case sensitive</label>
        </div>

        <div className="grid grid-cols-3 gap-1 text-xs">
          {Object.entries(searchFields).map(([field, checked]) => (
            <div key={field} className="flex items-center space-x-1">
              <Checkbox
                id={field}
                checked={checked}
                onCheckedChange={(checked) => setSearchFields(prev => ({
                  ...prev,
                  [field]: checked === true
                }))}
              />
              <label htmlFor={field} className="text-xs capitalize truncate">
                {field === 'name' ? 'Name' : field}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowReplace(!showReplace)}
          className="text-xs"
        >
          <Replace className="h-3 w-3 mr-1" />
          Replace
        </Button>

        {showReplace && (
          <div className="space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReplace}
              disabled={searchResults.length === 0 || !replaceTerm.trim()}
              className="text-xs"
            >
              Replace
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReplaceAll}
              disabled={searchResults.length === 0 || !replaceTerm.trim()}
              className="text-xs"
            >
              All
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FindReplaceContextMenu;
