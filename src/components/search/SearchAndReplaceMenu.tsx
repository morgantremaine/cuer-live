
import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import SearchInput from './SearchInput';
import ReplaceInput from './ReplaceInput';
import { useSearchAndReplace } from '@/hooks/useSearchAndReplace';
import { RundownItem } from '@/hooks/useRundownItems';

interface SearchAndReplaceMenuProps {
  items: RundownItem[];
  onUpdateItem: (id: string, field: string, value: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SearchAndReplaceMenu = ({
  items,
  onUpdateItem,
  isOpen,
  onClose
}: SearchAndReplaceMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  
  const {
    searchTerm,
    setSearchTerm,
    replaceTerm,
    setReplaceTerm,
    caseSensitive,
    setCaseSensitive,
    wholeWord,
    setWholeWord,
    matches,
    currentMatchIndex,
    replaceAll,
    replaceCurrent,
    goToNext,
    goToPrevious,
    clearSearch
  } = useSearchAndReplace({ items, onUpdateItem });

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        goToPrevious();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToNext, goToPrevious]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={menuRef}
      className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-4"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Search & Replace</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </div>

        <SearchInput
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          matchCount={matches.length}
          currentIndex={currentMatchIndex}
          onNext={goToNext}
          onPrevious={goToPrevious}
          onClear={clearSearch}
        />

        <ReplaceInput
          replaceTerm={replaceTerm}
          onReplaceChange={setReplaceTerm}
          onReplace={replaceCurrent}
          onReplaceAll={replaceAll}
          hasMatches={matches.length > 0}
        />

        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="case-sensitive"
              checked={caseSensitive}
              onCheckedChange={(checked) => setCaseSensitive(checked === true)}
            />
            <label htmlFor="case-sensitive" className="cursor-pointer">
              Match case
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="whole-word"
              checked={wholeWord}
              onCheckedChange={(checked) => setWholeWord(checked === true)}
            />
            <label htmlFor="whole-word" className="cursor-pointer">
              Whole word
            </label>
          </div>
        </div>

        {searchTerm && matches.length === 0 && (
          <p className="text-sm text-gray-500">No matches found</p>
        )}
      </div>
    </div>
  );
};

export default SearchAndReplaceMenu;
