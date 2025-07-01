
import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchButtonProps {
  onClick: () => void;
}

const SearchButton = ({ onClick }: SearchButtonProps) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 p-2"
      aria-label="Search rundown"
    >
      <Search className="h-4 w-4" />
    </Button>
  );
};

export default SearchButton;
