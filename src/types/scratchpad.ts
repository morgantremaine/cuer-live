
export interface ScratchpadData {
  mode: 'text' | 'table' | 'hybrid';
  textContent?: string; // Rich text/markdown
  tableData?: {
    rows: number;
    cols: number;
    cells: { [key: string]: any };
    headers?: string[];
  };
  version: number; // For future migrations
}

export interface ScratchpadCell {
  id: string;
  content: string;
  type?: 'text' | 'number' | 'formula';
}

export interface ScratchpadTable {
  id: string;
  rows: number;
  cols: number;
  cells: ScratchpadCell[];
  headers: string[];
}
