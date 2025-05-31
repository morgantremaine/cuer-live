
import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchControlsProps {
  currentMatchIndex: number;
  totalMatches: number;
  onNavigate: (direction: 'next' | 'prev') => void;
}

const SearchControls = ({ currentMatchIndex, totalMatches, onNavigate }: SearchControlsProps) => {
  if (totalMatches === 0) return null;

  return (
    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
      <span>
        {currentMatchIndex + 1} of {totalMatches} matches
      </span>
      <div className="flex items-center space-x-1">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('prev')}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onNavigate('next')}>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default SearchControls;
