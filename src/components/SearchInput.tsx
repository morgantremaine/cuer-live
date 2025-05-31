
import React, { forwardRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, placeholder = "Search in rundown..." }, ref) => {
    return (
      <div className="flex-1 relative">
        <Input
          ref={ref}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="pr-8"
        />
        <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
