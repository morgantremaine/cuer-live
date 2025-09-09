/**
 * Operational Transform Functions
 * 
 * Core transformation logic for resolving conflicts between concurrent operations
 */

import {
  Operation,
  TextInsertOperation,
  TextDeleteOperation,
  TextReplaceOperation,
  FieldUpdateOperation,
  ItemInsertOperation,
  ItemDeleteOperation,
  ItemMoveOperation,
  TransformResult,
  ConflictResolutionConfig
} from './types';

// Main transform function - transforms op1 against op2
export function transformOperation(
  op1: Operation,
  op2: Operation,
  config: ConflictResolutionConfig = getDefaultConfig()
): TransformResult {
  // If operations don't conflict, return unchanged
  if (op1.targetId !== op2.targetId || op1.field !== op2.field) {
    return {
      transformedOp: op1,
      transformedAgainst: op2
    };
  }

  // Handle same-type transformations
  if (op1.type === op2.type) {
    return transformSameType(op1, op2, config);
  }

  // Handle mixed-type transformations
  return transformMixedTypes(op1, op2, config);
}

function transformSameType(
  op1: Operation,
  op2: Operation,
  config: ConflictResolutionConfig
): TransformResult {
  switch (op1.type) {
    case 'text_insert':
      return transformTextInsertVsInsert(op1 as TextInsertOperation, op2 as TextInsertOperation);
    
    case 'text_delete':
      return transformTextDeleteVsDelete(op1 as TextDeleteOperation, op2 as TextDeleteOperation);
    
    case 'text_replace':
      return transformTextReplaceVsReplace(op1 as TextReplaceOperation, op2 as TextReplaceOperation, config);
    
    case 'field_update':
      return transformFieldVsField(op1 as FieldUpdateOperation, op2 as FieldUpdateOperation, config);
    
    case 'item_insert':
      return transformItemInsertVsInsert(op1 as ItemInsertOperation, op2 as ItemInsertOperation);
    
    case 'item_delete':
      return transformItemDeleteVsDelete(op1 as ItemDeleteOperation, op2 as ItemDeleteOperation);
    
    case 'item_move':
      return transformItemMoveVsMove(op1 as ItemMoveOperation, op2 as ItemMoveOperation);
    
    default:
      return { transformedOp: op1, transformedAgainst: op2 };
  }
}

function transformMixedTypes(
  op1: Operation,
  op2: Operation,
  config: ConflictResolutionConfig
): TransformResult {
  // Text vs text operations
  if (op1.type.startsWith('text_') && op2.type.startsWith('text_')) {
    return transformTextOperations(op1, op2, config);
  }

  // Item operations
  if (op1.type.startsWith('item_') && op2.type.startsWith('item_')) {
    return transformItemOperations(op1, op2, config);
  }

  // No transformation needed for unrelated types
  return { transformedOp: op1, transformedAgainst: op2 };
}

// Text Insert vs Text Insert
function transformTextInsertVsInsert(
  op1: TextInsertOperation,
  op2: TextInsertOperation
): TransformResult {
  let transformedOp = { ...op1 };

  if (op2.position <= op1.position) {
    // op2 inserted before op1's position, shift op1 right
    transformedOp.position += op2.length;
  }
  // If op2 inserted after op1's position, no change needed

  return { transformedOp, transformedAgainst: op2 };
}

// Text Delete vs Text Delete
function transformTextDeleteVsDelete(
  op1: TextDeleteOperation,
  op2: TextDeleteOperation
): TransformResult {
  let transformedOp = { ...op1 };

  const op1End = op1.position + op1.length;
  const op2End = op2.position + op2.length;

  if (op2End <= op1.position) {
    // op2 deleted before op1, shift op1 left
    transformedOp.position -= op2.length;
  } else if (op2.position >= op1End) {
    // op2 deleted after op1, no change needed
  } else {
    // Overlapping deletions - complex case
    const overlapStart = Math.max(op1.position, op2.position);
    const overlapEnd = Math.min(op1End, op2End);
    const overlapLength = Math.max(0, overlapEnd - overlapStart);

    if (overlapLength > 0) {
      // Adjust position and length for overlap
      if (op2.position < op1.position) {
        transformedOp.position = op2.position;
      }
      transformedOp.length -= overlapLength;
      
      // If entire deletion was already done, make this a no-op
      if (transformedOp.length <= 0) {
        transformedOp.length = 0;
        transformedOp.deletedContent = '';
      }
    }
  }

  return { transformedOp, transformedAgainst: op2 };
}

// Text Replace vs Text Replace
function transformTextReplaceVsReplace(
  op1: TextReplaceOperation,
  op2: TextReplaceOperation,
  config: ConflictResolutionConfig
): TransformResult {
  let transformedOp = { ...op1 };
  let conflict = undefined;

  const op1End = op1.position + op1.length;
  const op2End = op2.position + op2.length;

  // Check for overlap
  if (op1.position < op2End && op2.position < op1End) {
    // Overlapping replacements - conflict!
    conflict = {
      type: 'concurrent_edit',
      resolution: config.textConflicts === 'prefer_latest' ? 
        (op1.timestamp > op2.timestamp ? 'prefer_local' : 'prefer_remote') :
        'manual',
      metadata: {
        op1Range: [op1.position, op1End],
        op2Range: [op2.position, op2End],
        op1Content: op1.newContent,
        op2Content: op2.newContent
      }
    };

    if (config.textConflicts === 'merge') {
      // Attempt to merge the changes
      transformedOp = attemptTextMerge(op1, op2);
    } else if (config.textConflicts === 'prefer_latest') {
      if (op2.timestamp > op1.timestamp) {
        // Cancel op1, op2 takes precedence
        transformedOp.newContent = transformedOp.oldContent;
        transformedOp.length = 0;
      }
    }
  } else if (op2End <= op1.position) {
    // op2 replaced before op1, adjust op1 position
    const lengthDiff = op2.newContent.length - op2.length;
    transformedOp.position += lengthDiff;
  }

  return { transformedOp, transformedAgainst: op2, conflict };
}

// Field Update vs Field Update
function transformFieldVsField(
  op1: FieldUpdateOperation,
  op2: FieldUpdateOperation,
  config: ConflictResolutionConfig
): TransformResult {
  let transformedOp = { ...op1 };
  
  const conflict = {
    type: 'concurrent_edit' as 'concurrent_edit',
    resolution: config.fieldConflicts === 'prefer_latest' ?
      (op1.timestamp > op2.timestamp ? 'prefer_local' as 'prefer_local' : 'prefer_remote' as 'prefer_remote') :
      'manual' as 'manual',
    metadata: {
      op1Value: op1.newValue,
      op2Value: op2.newValue,
      field: op1.field
    }
  };

  if (config.fieldConflicts === 'prefer_latest') {
    if (op2.timestamp > op1.timestamp) {
      // op2 is more recent, cancel op1
      transformedOp.newValue = transformedOp.oldValue;
    }
  }

  return { transformedOp, transformedAgainst: op2, conflict };
}

// Item Insert vs Item Insert
function transformItemInsertVsInsert(
  op1: ItemInsertOperation,
  op2: ItemInsertOperation
): TransformResult {
  let transformedOp = { ...op1 };

  if (op2.position <= op1.position) {
    // op2 inserted before op1, shift op1 position
    transformedOp.position += 1;
  }

  return { transformedOp, transformedAgainst: op2 };
}

// Item Delete vs Item Delete
function transformItemDeleteVsDelete(
  op1: ItemDeleteOperation,
  op2: ItemDeleteOperation
): TransformResult {
  let transformedOp = { ...op1 };

  if (op1.position === op2.position) {
    // Same item deleted - make op1 a no-op
    transformedOp.position = -1; // Invalid position indicates no-op
  } else if (op2.position < op1.position) {
    // op2 deleted before op1, shift op1 left
    transformedOp.position -= 1;
  }

  return { transformedOp, transformedAgainst: op2 };
}

// Item Move vs Item Move
function transformItemMoveVsMove(
  op1: ItemMoveOperation,
  op2: ItemMoveOperation
): TransformResult {
  let transformedOp = { ...op1 };

  // Complex transformation for moves - need to account for both from and to positions
  const op1From = op1.fromPosition;
  const op1To = op1.toPosition;
  const op2From = op2.fromPosition;
  const op2To = op2.toPosition;

  // If moving the same item, later operation wins
  if (op1.itemId === op2.itemId) {
    if (op2.timestamp > op1.timestamp) {
      // Cancel op1
      transformedOp.fromPosition = transformedOp.toPosition;
    }
    return { transformedOp, transformedAgainst: op2 };
  }

  // Transform positions based on op2's move
  if (op2From < op1From) {
    transformedOp.fromPosition -= 1;
  }
  if (op2From < op1To) {
    transformedOp.toPosition -= 1;
  }
  if (op2To <= op1From) {
    transformedOp.fromPosition += 1;
  }
  if (op2To <= op1To) {
    transformedOp.toPosition += 1;
  }

  return { transformedOp, transformedAgainst: op2 };
}

// Handle mixed text operations
function transformTextOperations(
  op1: Operation,
  op2: Operation,
  config: ConflictResolutionConfig
): TransformResult {
  // Implementation for mixed text operations (insert vs delete, etc.)
  // This is a simplified version - full implementation would be more complex
  
  if (op1.type === 'text_insert' && op2.type === 'text_delete') {
    return transformInsertVsDelete(op1 as TextInsertOperation, op2 as TextDeleteOperation);
  }
  
  if (op1.type === 'text_delete' && op2.type === 'text_insert') {
    return transformDeleteVsInsert(op1 as TextDeleteOperation, op2 as TextInsertOperation);
  }

  return { transformedOp: op1, transformedAgainst: op2 };
}

function transformInsertVsDelete(
  insert: TextInsertOperation,
  delete_op: TextDeleteOperation
): TransformResult {
  let transformedOp = { ...insert };
  
  const deleteEnd = delete_op.position + delete_op.length;
  
  if (insert.position <= delete_op.position) {
    // Insert is before delete, no change needed
  } else if (insert.position >= deleteEnd) {
    // Insert is after delete, shift left
    transformedOp.position -= delete_op.length;
  } else {
    // Insert is within deleted range, move to delete position
    transformedOp.position = delete_op.position;
  }

  return { transformedOp, transformedAgainst: delete_op };
}

function transformDeleteVsInsert(
  delete_op: TextDeleteOperation,
  insert: TextInsertOperation
): TransformResult {
  let transformedOp = { ...delete_op };
  
  if (insert.position <= delete_op.position) {
    // Insert is before delete, shift delete right
    transformedOp.position += insert.length;
  }
  // If insert is after delete, no change needed

  return { transformedOp, transformedAgainst: insert };
}

// Handle mixed item operations
function transformItemOperations(
  op1: Operation,
  op2: Operation,
  config: ConflictResolutionConfig
): TransformResult {
  // Similar to text operations, handle mixed item operations
  // For now, return as-is
  return { transformedOp: op1, transformedAgainst: op2 };
}

// Attempt to merge conflicting text operations
function attemptTextMerge(
  op1: TextReplaceOperation,
  op2: TextReplaceOperation
): TextReplaceOperation {
  // Simple merge strategy - this could be much more sophisticated
  const mergedContent = op1.newContent + ' | ' + op2.newContent;
  
  return {
    ...op1,
    newContent: mergedContent,
    length: Math.max(op1.length, op2.length)
  };
}

// Default configuration
function getDefaultConfig(): ConflictResolutionConfig {
  return {
    textConflicts: 'prefer_latest',
    fieldConflicts: 'prefer_latest',
    structuralConflicts: 'prefer_latest',
    autoResolveTimeout: 5000
  };
}

// Batch transform a list of operations
export function transformOperationSequence(
  operations: Operation[],
  againstOperations: Operation[],
  config?: ConflictResolutionConfig
): { transformedOps: Operation[]; conflicts: any[] } {
  const transformedOps: Operation[] = [];
  const conflicts: any[] = [];
  
  for (const op of operations) {
    let currentOp = op;
    
    for (const againstOp of againstOperations) {
      const result = transformOperation(currentOp, againstOp, config);
      currentOp = result.transformedOp;
      
      if (result.conflict) {
        conflicts.push({
          originalOp: op,
          againstOp,
          conflict: result.conflict
        });
      }
    }
    
    transformedOps.push(currentOp);
  }
  
  return { transformedOps, conflicts };
}
