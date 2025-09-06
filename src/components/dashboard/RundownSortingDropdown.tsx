import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';
import { SortOption } from '@/hooks/useRundownSorting';

interface RundownSortingDropdownProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const sortOptions = [
  { value: 'dateModified' as const, label: 'Date Modified' },
  { value: 'dateCreated' as const, label: 'Date Created' },
  { value: 'showDate' as const, label: 'Show Date' }
];

export const RundownSortingDropdown = ({ sortBy, onSortChange }: RundownSortingDropdownProps) => {
  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[140px] h-8 text-sm bg-background/80 border-border/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-background/95 backdrop-blur-sm border-border/50">
          {sortOptions.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="text-sm hover:bg-accent/50 focus:bg-accent/50"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};