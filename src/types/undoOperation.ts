
export type UndoOperationType = 'cell_edit' | 'add_row' | 'add_header' | 'delete_row' | 'reorder';

export interface UndoableOperation {
  type: UndoOperationType;
  data: any;
  userId?: string;
  timestamp: number;
  description: string;
}

// Specific operation data types for type safety
export interface CellEditOperationData {
  itemId: string;
  updates: Record<string, any>;
  oldValues: Record<string, any>;
}

export interface AddRowOperationData {
  addedItemId: string;
}

export interface AddHeaderOperationData {
  addedItemId: string;
}

export interface DeleteRowOperationData {
  deletedItem: any; // Full RundownItem
  deletedIndex: number;
}

export interface ReorderOperationData {
  oldOrder: string[];
  newOrder: string[];
}
