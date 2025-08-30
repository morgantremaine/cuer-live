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
  items: any[]; // Current rundown items
  columns?: any[]; // Column definitions to determine searchable fields
}

const FindReplaceDialog = ({ isOpen, onClose, onUpdateItem, items, columns }: FindReplaceDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const { findMatches, replaceAll, replaceCurrent, lastSearchResults, clearResults } = useFindReplace(onUpdateItem, items);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Generate searchable fields dynamically from all built-in fields and custom columns
  const searchFields = React.useMemo(() => {
    const builtInFields = ['name', 'script', 'talent', 'notes', 'startTime', 'duration', 'endTime', 'elapsedTime', 'gfx', 'video', 'images'];
    const customFields: string[] = [];
    
    // Add custom fields from columns if available
    if (columns) {
      columns.forEach(column => {
        if (column.isCustom && column.key) {
          customFields.push(`customFields.${column.key}`);
        }
      });
    }
    
    // If no columns provided, try to extract custom fields from items
    if (!columns && items.length > 0) {
      const customFieldKeys = new Set<string>();
      items.forEach(item => {
        if (item.customFields) {
          Object.keys(item.customFields).forEach(key => {
            customFieldKeys.add(`customFields.${key}`);
          });
        }
      });
      customFields.push(...Array.from(customFieldKeys));
    }
    
    return [...builtInFields, ...customFields];
  }, [columns, items]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      // Clear previous search results and search term when dialog opens to force fresh data
      clearResults();
      setCurrentMatchIndex(0);
      setSearchTerm('');
      setReplaceTerm('');
      // Reset position when opening
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, clearResults]);

  useEffect(() => {
    if (searchTerm.trim()) {
      findMatches({
        searchTerm,
        replaceTerm: '',
        fields: searchFields,
        caseSensitive,
        wholeWord: false
      });
      setCurrentMatchIndex(0);
    } else {
      // Clear results when search term is empty
      clearResults();
      setCurrentMatchIndex(0);
    }
  }, [searchTerm, findMatches, clearResults]);

  const handleSearch = () => {
    if (searchTerm.trim()) {
      // Force a fresh search with current case sensitivity setting
      findMatches({
        searchTerm,
        replaceTerm: '',
        fields: searchFields,
        caseSensitive,
        wholeWord: false
      });
      setCurrentMatchIndex(0);
    }
  };

  const handleReplace = () => {
    if (searchTerm.trim() && replaceTerm.trim()) {
      const result = replaceAll({
        searchTerm,
        replaceTerm,
        fields: searchFields,
        caseSensitive,
        wholeWord: false
      });
      // Clear search after replace
      setSearchTerm('');
      setReplaceTerm('');
      setCurrentMatchIndex(0);
    }
  };

  const handleReplaceCurrent = () => {
    if (searchTerm.trim() && replaceTerm.trim() && lastSearchResults.matches.length > 0) {
      const result = replaceCurrent({
        searchTerm,
        replaceTerm,
        fields: searchFields,
        caseSensitive,
        wholeWord: false
      }, currentMatchIndex);
      
      if (result.replacements > 0) {
        // Refresh the search to get updated results
        setTimeout(() => {
          findMatches({
            searchTerm,
            replaceTerm: '',
            fields: searchFields,
            caseSensitive,
            wholeWord: false
          });
          // Move to next match or reset if we were at the last one
          const newIndex = currentMatchIndex >= lastSearchResults.matches.length - 1 ? 0 : currentMatchIndex;
          setCurrentMatchIndex(newIndex);
        }, 100);
      }
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
    
    // Clear any existing selections first
    window.getSelection()?.removeAllRanges();
    
    // Scroll to the matched item and select matching text
    const currentMatch = lastSearchResults.matches[newIndex];
    if (currentMatch) {
      const element = document.querySelector(`tr[data-item-id="${currentMatch.itemId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Find and select the matching text in input fields
        setTimeout(() => {
          const inputs = element.querySelectorAll('input, textarea');
          const flags = 'gi';
          const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
          
          for (const input of inputs) {
            const inputElement = input as HTMLInputElement | HTMLTextAreaElement;
            if (inputElement.value && regex.test(inputElement.value)) {
              // Find the first match in this input
              const match = inputElement.value.match(regex);
              if (match) {
                const matchIndex = inputElement.value.search(regex);
                if (matchIndex !== -1) {
                  // Focus the input and select the matched text
                  inputElement.focus();
                  inputElement.setSelectionRange(matchIndex, matchIndex + match[0].length);
                  break; // Only highlight the first match found
                }
              }
            }
          }
        }, 100); // Small delay to ensure scroll completes
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

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (rect) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!isOpen) return null;

  return (
    <div 
      ref={dialogRef}
      className="fixed z-50 select-none"
      style={{
        left: `${Math.max(0, Math.min(window.innerWidth - 384, position.x))}px`,
        top: `${Math.max(0, Math.min(window.innerHeight - 400, position.y))}px`,
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
    >
      <Card className="w-96 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between mb-4 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
          >
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
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReplaceCurrent}
                  disabled={!searchTerm.trim() || !replaceTerm.trim() || lastSearchResults.matches.length === 0}
                  className="flex-1"
                >
                  Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReplace}
                  disabled={!searchTerm.trim() || !replaceTerm.trim()}
                  className="flex-1"
                >
                  Replace All
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="caseSensitive"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="caseSensitive" className="text-sm">
                  Preserve case pattern
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FindReplaceDialog;