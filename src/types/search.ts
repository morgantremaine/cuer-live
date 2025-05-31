
export interface SearchMatch {
  itemId: string;
  field: string;
  index: number;
  length: number;
}

export interface SearchBarProps {
  items: any[];
  visibleColumns: any[];
  onHighlightMatch: (itemId: string, field: string, startIndex: number, endIndex: number) => void;
  onReplaceText: (itemId: string, field: string, searchText: string, replaceText: string, replaceAll: boolean) => void;
}
