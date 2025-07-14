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
  const [showReplace, setShowReplace] = useState(false);
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
        
        setTimeout(() => {
          console.log('=== FIND AND REPLACE DEBUG ===');
          console.log('Current match:', currentMatch);
          console.log('Element found:', element);
          console.log('Search term:', searchTerm);
          
          const caseInsensitive = caseSensitive ? '' : 'i';
          const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedSearchTerm, `g${caseInsensitive}`);
          console.log('Regex:', regex);
          
          // First try to find and select text in regular input/textarea elements
          const inputs = element.querySelectorAll('input, textarea') as NodeListOf<HTMLInputElement | HTMLTextAreaElement>;
          console.log('Found inputs/textareas:', inputs.length);
          
          for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            console.log(`Input ${i}:`, input);
            console.log(`  - value: "${input.value}"`);
            console.log(`  - data-cell-ref: "${input.getAttribute('data-cell-ref')}"`);
            console.log(`  - disabled: ${input.disabled}`);
            console.log(`  - visible: ${input.offsetParent !== null}`);
            
            if (input.value && regex.test(input.value)) {
              console.log(`  - MATCH FOUND in input ${i}!`);
              regex.lastIndex = 0; // Reset regex
              const match = regex.exec(input.value);
              if (match) {
                console.log(`  - Match details:`, match);
                input.focus();
                input.setSelectionRange(match.index, match.index + match[0].length);
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                console.log('=== HIGHLIGHTING COMPLETED IN INPUT ===');
                return;
              }
            }
            regex.lastIndex = 0; // Reset regex for next iteration
          }
          
          // If no match in regular inputs, check for script cells
          const scriptCells = element.querySelectorAll('.expandable-script-cell') as NodeListOf<HTMLElement>;
          console.log('Found script cells:', scriptCells.length);
          
          for (let i = 0; i < scriptCells.length; i++) {
            const scriptCell = scriptCells[i];
            console.log(`Script cell ${i}:`, scriptCell);
            
            // Look for all textareas in this script cell
            const textareas = scriptCell.querySelectorAll('textarea') as NodeListOf<HTMLTextAreaElement>;
            console.log(`  - Found textareas: ${textareas.length}`);
            
            for (let j = 0; j < textareas.length; j++) {
              const textarea = textareas[j];
              console.log(`    Textarea ${j}:`, textarea);
              console.log(`      - value: "${textarea.value}"`);
              console.log(`      - disabled: ${textarea.disabled}`);
              console.log(`      - visible: ${textarea.offsetParent !== null}`);
              console.log(`      - data-cell-ref: "${textarea.getAttribute('data-cell-ref')}"`);
              
              if (textarea.value && regex.test(textarea.value)) {
                console.log(`      - MATCH FOUND in textarea ${j}!`);
                regex.lastIndex = 0; // Reset regex
                
                const isVisible = textarea.offsetParent !== null && !textarea.disabled;
                console.log(`      - Is visible and enabled: ${isVisible}`);
                
                if (isVisible) {
                  // Textarea is already visible, just select the text
                  const match = regex.exec(textarea.value);
                  if (match) {
                    console.log(`      - Selecting text at position ${match.index}-${match.index + match[0].length}`);
                    textarea.focus();
                    textarea.setSelectionRange(match.index, match.index + match[0].length);
                    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    console.log('=== HIGHLIGHTING COMPLETED IN SCRIPT TEXTAREA ===');
                    return;
                  }
                } else {
                  console.log(`      - Textarea not visible, trying to activate it...`);
                  // Need to activate editing mode first
                  
                  // Find the expand button (if collapsed)
                  const expandButton = scriptCell.querySelector('button') as HTMLButtonElement;
                  if (expandButton) {
                    console.log(`      - Clicking expand button`);
                    expandButton.click(); // Expand the cell
                  }
                  
                  // Wait a bit, then find the clickable content div to enter edit mode
                  setTimeout(() => {
                    const contentDiv = scriptCell.querySelector('div[style*="cursor"]') as HTMLDivElement;
                    console.log(`      - Found content div:`, contentDiv);
                    if (contentDiv) {
                      console.log(`      - Clicking content div to enter edit mode`);
                      contentDiv.click(); // Enter edit mode
                      
                      // Wait for edit mode to activate, then select text
                      setTimeout(() => {
                        const editableTextarea = scriptCell.querySelector('textarea:not([disabled])') as HTMLTextAreaElement;
                        console.log(`      - Found editable textarea after activation:`, editableTextarea);
                        if (editableTextarea && editableTextarea.offsetParent !== null) {
                          regex.lastIndex = 0; // Reset regex
                          const match = regex.exec(editableTextarea.value);
                          if (match) {
                            console.log(`      - Final selection at position ${match.index}-${match.index + match[0].length}`);
                            editableTextarea.focus();
                            editableTextarea.setSelectionRange(match.index, match.index + match[0].length);
                            editableTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            console.log('=== HIGHLIGHTING COMPLETED AFTER ACTIVATION ===');
                          }
                        }
                      }, 150);
                    }
                  }, 100);
                  return;
                }
              }
              regex.lastIndex = 0; // Reset regex for next iteration
            }
          }
          
          console.log('=== NO MATCHES FOUND ===');
        }, 100);
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
        </CardContent>
      </Card>
    </div>
  );
};

export default FindReplaceDialog;