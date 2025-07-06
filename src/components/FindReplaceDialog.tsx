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
}

const FindReplaceDialog = ({ isOpen, onClose, onUpdateItem, items }: FindReplaceDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const { findMatches, replaceAll, lastSearchResults, clearResults } = useFindReplace(onUpdateItem, items);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fields to search in
  const searchFields = ['name', 'script', 'talent', 'notes', 'customFields.location', 'customFields.graphics'];

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      // Clear previous search results and search term when dialog opens to force fresh data
      clearResults();
      setCurrentMatchIndex(0);
      setSearchTerm('');
      setReplaceTerm('');
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

  const navigateToMatch = (direction: 'next' | 'prev') => {
    if (lastSearchResults.matches.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = currentMatchIndex >= lastSearchResults.matches.length - 1 ? 0 : currentMatchIndex + 1;
    } else {
      newIndex = currentMatchIndex <= 0 ? lastSearchResults.matches.length - 1 : currentMatchIndex - 1;
    }
    
    setCurrentMatchIndex(newIndex);
    
    // Scroll to the matched item and highlight matching text
    const currentMatch = lastSearchResults.matches[newIndex];
    if (currentMatch) {
      const element = document.querySelector(`tr[data-item-id="${currentMatch.itemId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Find and highlight matching text within input fields and text content
        const highlightMatchingText = (el: Element) => {
          // Always highlight case-insensitively since search is case-insensitive
          const flags = 'gi';
          const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
          
          // Check input fields and textareas
          const inputs = el.querySelectorAll('input, textarea');
          inputs.forEach(input => {
            const inputElement = input as HTMLInputElement | HTMLTextAreaElement;
            if (inputElement.value && regex.test(inputElement.value)) {
              // Temporarily highlight the input field
              const originalBorder = inputElement.style.border;
              const originalBackground = inputElement.style.backgroundColor;
              
              inputElement.style.border = '2px solid #fbbf24';
              inputElement.style.backgroundColor = '#fef3c7';
              
              setTimeout(() => {
                inputElement.style.border = originalBorder;
                inputElement.style.backgroundColor = originalBackground;
              }, 3000);
            }
          });
          
          // Also check text nodes for any non-input text
          const walker = document.createTreeWalker(
            el,
            NodeFilter.SHOW_TEXT,
            (node) => {
              // Skip text nodes inside input elements
              const parent = node.parentElement;
              return parent && !['INPUT', 'TEXTAREA'].includes(parent.tagName) ? 
                NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
          );
          
          const textNodes: Text[] = [];
          let node;
          while (node = walker.nextNode()) {
            textNodes.push(node as Text);
          }
          
          textNodes.forEach(textNode => {
            if (textNode.textContent && regex.test(textNode.textContent)) {
              const parent = textNode.parentNode;
              if (parent) {
                const wrapper = document.createElement('span');
                wrapper.innerHTML = textNode.textContent.replace(regex, '<mark style="background-color: #fbbf24; color: #000; padding: 1px 2px; border-radius: 2px;">$&</mark>');
                parent.replaceChild(wrapper, textNode);
                
                // Remove highlight after 3 seconds
                setTimeout(() => {
                  if (wrapper.parentNode && textNode.textContent) {
                    wrapper.parentNode.replaceChild(document.createTextNode(textNode.textContent), wrapper);
                  }
                }, 3000);
              }
            }
          });
        };
        
        highlightMatchingText(element);
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
    <div className="fixed top-4 right-4 z-50">
      <Card className="w-96 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
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