
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface SearchInputProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  matchCount: number;
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onClear: () => void;
}

const SearchInput = ({
  searchTerm,
  onSearchChange,
  matchCount,
  currentIndex,
  onNext,
  onPrevious,
  onClear
}: SearchInputProps) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 pr-8"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {matchCount > 0 && (
        <>
          <span className="text-sm text-gray-600 whitespace-nowrap">
            {currentIndex + 1} of {matchCount}
          </span>
          <div className="flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={matchCount === 0}
              className="h-6 w-6 p-0"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              disabled={matchCount === 0}
              className="h-6 w-6 p-0"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default SearchInput;
