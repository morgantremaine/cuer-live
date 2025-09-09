/**
 * Operation Creators and Utilities
 * 
 * Functions to create and validate operations for the OT system
 */

import { 
  Operation, 
  OperationId, 
  TextInsertOperation, 
  TextDeleteOperation,
  TextReplaceOperation,
  FieldUpdateOperation,
  ItemInsertOperation,
  ItemDeleteOperation,
  ItemMoveOperation,
  BaseOperation
} from './types';

// Generate unique operation ID
export function createOperationId(userId: string, sequence: number): OperationId {
  return {
    userId,
    timestamp: Date.now(),
    sequence
  };
}

// Base operation creator
function createBaseOperation(
  type: string,
  targetId: string,
  field: string,
  userId: string,
  vectorClock: Record<string, number>,
  sequence: number
): BaseOperation {
  return {
    id: createOperationId(userId, sequence),
    type,
    targetId,
    field,
    userId,
    timestamp: Date.now(),
    vectorClock: { ...vectorClock }
  };
}

// Text operation creators
export function createTextInsert(
  targetId: string,
  field: string,
  position: number,
  content: string,
  userId: string,
  vectorClock: Record<string, number>,
  sequence: number
): TextInsertOperation {
  return {
    ...createBaseOperation('text_insert', targetId, field, userId, vectorClock, sequence),
    type: 'text_insert',
    position,
    content,
    length: content.length
  };
}

export function createTextDelete(
  targetId: string,
  field: string,
  position: number,
  length: number,
  deletedContent: string,
  userId: string,
  vectorClock: Record<string, number>,
  sequence: number
): TextDeleteOperation {
  return {
    ...createBaseOperation('text_delete', targetId, field, userId, vectorClock, sequence),
    type: 'text_delete',
    position,
    length,
    deletedContent
  };
}

export function createTextReplace(
  targetId: string,
  field: string,
  position: number,
  length: number,
  newContent: string,
  oldContent: string,
  userId: string,
  vectorClock: Record<string, number>,
  sequence: number
): TextReplaceOperation {
  return {
    ...createBaseOperation('text_replace', targetId, field, userId, vectorClock, sequence),
    type: 'text_replace',
    position,
    length,
    newContent,
    oldContent
  };
}

// Field operation creator
export function createFieldUpdate(
  targetId: string,
  field: string,
  newValue: any,
  oldValue: any,
  userId: string,
  vectorClock: Record<string, number>,
  sequence: number
): FieldUpdateOperation {
  const dataType = Array.isArray(newValue) ? 'array' : 
                  typeof newValue === 'object' && newValue !== null ? 'object' :
                  typeof newValue as 'string' | 'number' | 'boolean';

  return {
    ...createBaseOperation('field_update', targetId, field, userId, vectorClock, sequence),
    type: 'field_update',
    newValue,
    oldValue,
    dataType
  };
}

// Structural operation creators
export function createItemInsert(
  position: number,
  item: any,
  userId: string,
  vectorClock: Record<string, number>,
  sequence: number
): ItemInsertOperation {
  return {
    ...createBaseOperation('item_insert', 'rundown', 'items', userId, vectorClock, sequence),
    type: 'item_insert',
    targetId: 'rundown',
    field: 'items',
    position,
    item
  };
}

export function createItemDelete(
  position: number,
  deletedItem: any,
  userId: string,
  vectorClock: Record<string, number>,
  sequence: number
): ItemDeleteOperation {
  return {
    ...createBaseOperation('item_delete', 'rundown', 'items', userId, vectorClock, sequence),
    type: 'item_delete',
    targetId: 'rundown',
    field: 'items',
    position,
    deletedItem
  };
}

export function createItemMove(
  fromPosition: number,
  toPosition: number,
  itemId: string,
  userId: string,
  vectorClock: Record<string, number>,
  sequence: number
): ItemMoveOperation {
  return {
    ...createBaseOperation('item_move', 'rundown', 'items', userId, vectorClock, sequence),
    type: 'item_move',
    targetId: 'rundown',
    field: 'items',
    fromPosition,
    toPosition,
    itemId
  };
}

// Operation validation
export function validateOperation(operation: Operation): boolean {
  // Basic structure validation
  if (!operation.id || !operation.type || !operation.targetId || !operation.field) {
    return false;
  }

  // Type-specific validation
  switch (operation.type) {
    case 'text_insert':
      const insertOp = operation as TextInsertOperation;
      return insertOp.position >= 0 && insertOp.content.length > 0 && insertOp.length === insertOp.content.length;

    case 'text_delete':
      const deleteOp = operation as TextDeleteOperation;
      return deleteOp.position >= 0 && deleteOp.length > 0;

    case 'text_replace':
      const replaceOp = operation as TextReplaceOperation;
      return replaceOp.position >= 0 && replaceOp.length >= 0;

    case 'field_update':
      const fieldOp = operation as FieldUpdateOperation;
      return fieldOp.newValue !== undefined && fieldOp.oldValue !== undefined;

    case 'item_insert':
      const insertItemOp = operation as ItemInsertOperation;
      return insertItemOp.position >= 0 && insertItemOp.item !== undefined;

    case 'item_delete':
      const deleteItemOp = operation as ItemDeleteOperation;
      return deleteItemOp.position >= 0 && deleteItemOp.deletedItem !== undefined;

    case 'item_move':
      const moveOp = operation as ItemMoveOperation;
      return moveOp.fromPosition >= 0 && moveOp.toPosition >= 0 && moveOp.itemId.length > 0;

    default:
      return false;
  }
}

// Operation ordering by vector clock
export function compareOperations(opA: Operation, opB: Operation): number {
  // First compare by causality (vector clock)
  const vcA = opA.vectorClock;
  const vcB = opB.vectorClock;
  
  let aBeforeB = true;
  let bBeforeA = true;
  
  // Check all users in vector clocks
  const allUsers = new Set([...Object.keys(vcA), ...Object.keys(vcB)]);
  
  for (const user of allUsers) {
    const clockA = vcA[user] || 0;
    const clockB = vcB[user] || 0;
    
    if (clockA > clockB) bBeforeA = false;
    if (clockB > clockA) aBeforeB = false;
  }
  
  // If there's a causal relationship, respect it
  if (aBeforeB && !bBeforeA) return -1;
  if (bBeforeA && !aBeforeB) return 1;
  
  // If concurrent, use timestamp as tiebreaker
  if (opA.timestamp !== opB.timestamp) {
    return opA.timestamp - opB.timestamp;
  }
  
  // Final tiebreaker: user ID
  return opA.userId.localeCompare(opB.userId);
}

// Check if operations conflict
export function operationsConflict(opA: Operation, opB: Operation): boolean {
  // Same target and field
  if (opA.targetId !== opB.targetId || opA.field !== opB.field) {
    return false;
  }
  
  // Concurrent operations (no causal relationship)
  const vcA = opA.vectorClock;
  const vcB = opB.vectorClock;
  
  let aBeforeB = true;
  let bBeforeA = true;
  
  const allUsers = new Set([...Object.keys(vcA), ...Object.keys(vcB)]);
  
  for (const user of allUsers) {
    const clockA = vcA[user] || 0;
    const clockB = vcB[user] || 0;
    
    if (clockA > clockB) bBeforeA = false;
    if (clockB > clockA) aBeforeB = false;
  }
  
  // If concurrent, check for actual conflict
  if (!aBeforeB && !bBeforeA) {
    return checkSpecificConflict(opA, opB);
  }
  
  return false;
}

function checkSpecificConflict(opA: Operation, opB: Operation): boolean {
  // Text operations conflict if they overlap
  if (opA.type.startsWith('text_') && opB.type.startsWith('text_')) {
    const posA = (opA as any).position;
    const posB = (opB as any).position;
    const lenA = (opA as any).length || (opA as any).content?.length || 0;
    const lenB = (opB as any).length || (opB as any).content?.length || 0;
    
    return posA < posB + lenB && posB < posA + lenA;
  }
  
  // Field operations always conflict
  if (opA.type === 'field_update' && opB.type === 'field_update') {
    return true;
  }
  
  // Structural operations conflict if they affect same position
  if (opA.type.startsWith('item_') && opB.type.startsWith('item_')) {
    const posA = (opA as any).position;
    const posB = (opB as any).position;
    
    return posA === posB;
  }
  
  return false;
}