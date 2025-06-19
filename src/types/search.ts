
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

export interface SearchMatch {
  itemId: string;
  field: string;
  index: number;
  length: number;
}

export interface SearchHighlight {
  itemId: string;
  field: string;
  startIndex: number;
  endIndex: number;
}

export interface SearchBarProps {
  items: RundownItem[];
  visibleColumns: Column[];
  onHighlightMatch: (itemId: string, field: string, startIndex: number, endIndex: number) => void;
  onReplaceText: (itemId: string, field: string, searchText: string, replaceText: string, replaceAll: boolean) => void;
  updateItem: (id: string, field: string, value: string) => void;
  saveUndoState?: (items: RundownItem[], columns: Column[], title: string, action: string) => void;
  columns?: Column[];
  title?: string;
}
