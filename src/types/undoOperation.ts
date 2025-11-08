export type OperationType = 'cell_edit' | 'add_row' | 'add_header' | 'delete_row' | 'reorder';

export interface UndoableOperation {
  type: OperationType;
  data: any;
  userId: string;
  timestamp: number;
  description: string;
}
