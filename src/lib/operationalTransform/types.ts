/**
 * Operational Transform Types
 * 
 * Defines the core types for operational transformation system
 * Similar to Google Docs/Sheets collaborative editing
 */

export interface OperationId {
  userId: string;
  timestamp: number;
  sequence: number;
}

export interface BaseOperation {
  id: OperationId;
  type: string;
  targetId: string; // item ID or rundown ID for global operations
  field: string;
  userId: string;
  timestamp: number;
  // Vector clock for causal ordering
  vectorClock: Record<string, number>;
}

// Text operations for collaborative text editing
export interface TextInsertOperation extends BaseOperation {
  type: 'text_insert';
  position: number;
  content: string;
  length: number;
}

export interface TextDeleteOperation extends BaseOperation {
  type: 'text_delete';
  position: number;
  length: number;
  deletedContent: string; // For undo/redo
}

export interface TextReplaceOperation extends BaseOperation {
  type: 'text_replace';
  position: number;
  length: number;
  newContent: string;
  oldContent: string;
}

// Field operations for non-text data
export interface FieldUpdateOperation extends BaseOperation {
  type: 'field_update';
  newValue: any;
  oldValue: any;
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array';
}

// Structural operations
export interface ItemInsertOperation extends BaseOperation {
  type: 'item_insert';
  targetId: 'rundown'; // Always targets rundown for structural changes
  field: 'items';
  position: number;
  item: any;
}

export interface ItemDeleteOperation extends BaseOperation {
  type: 'item_delete';
  targetId: 'rundown';
  field: 'items';
  position: number;
  deletedItem: any;
}

export interface ItemMoveOperation extends BaseOperation {
  type: 'item_move';
  targetId: 'rundown';
  field: 'items';
  fromPosition: number;
  toPosition: number;
  itemId: string;
}

export type Operation = 
  | TextInsertOperation 
  | TextDeleteOperation 
  | TextReplaceOperation
  | FieldUpdateOperation
  | ItemInsertOperation
  | ItemDeleteOperation
  | ItemMoveOperation;

// Transform result
export interface TransformResult {
  transformedOp: Operation;
  transformedAgainst: Operation;
  conflict?: {
    type: 'concurrent_edit' | 'causality_violation' | 'data_conflict';
    resolution: 'prefer_local' | 'prefer_remote' | 'merge' | 'manual';
    metadata?: any;
  };
}

// Client state for OT
export interface CollaborativeClient {
  userId: string;
  localOperations: Operation[];
  acknowledgedOperations: Operation[];
  pendingOperations: Operation[];
  vectorClock: Record<string, number>;
  activeEdits: Map<string, { field: string; startTime: number }>;
}

// Server state representation
export interface OperationLogEntry {
  operation: Operation;
  appliedAt: number;
  serverSequence: number;
  transformedAgainst: string[]; // IDs of operations this was transformed against
}

// Conflict resolution preferences
export interface ConflictResolutionConfig {
  textConflicts: 'merge' | 'prefer_latest' | 'prefer_longest' | 'manual';
  fieldConflicts: 'prefer_latest' | 'prefer_local' | 'manual';
  structuralConflicts: 'prefer_latest' | 'manual';
  autoResolveTimeout: number; // ms to wait before auto-resolution
}

// Edit session tracking
export interface EditSession {
  userId: string;
  targetId: string;
  field: string;
  startTime: number;
  lastActivity: number;
  currentValue?: any;
  selectionStart?: number;
  selectionEnd?: number;
}

// Collaborative state snapshot
export interface CollaborativeSnapshot {
  data: any; // The actual rundown/blueprint data
  operations: OperationLogEntry[];
  activeSessions: EditSession[];
  vectorClock: Record<string, number>;
  lastUpdated: number;
}