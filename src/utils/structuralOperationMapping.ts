/**
 * Structural Operation Mapping Utilities
 * 
 * Provides consistent mapping between operation types and broadcast formats
 * to ensure all structural operations use the standardized "items:*" broadcast pattern.
 */

import { RundownItem } from '@/types/rundown';

export type StructuralOperationType = 'add_row' | 'delete_row' | 'move_rows' | 'copy_rows' | 'reorder' | 'add_header' | 'toggle_lock';

export type BroadcastFieldName = 'items:add' | 'items:remove' | 'items:remove-multiple' | 'items:copy' | 'items:reorder' | 'lock_state';

/**
 * Maps database operation types to broadcast field names
 * Ensures consistent "items:*" format across all structural operations
 */
export function mapOperationToBroadcastField(operationType: StructuralOperationType): BroadcastFieldName {
  const mapping: Record<StructuralOperationType, BroadcastFieldName> = {
    'add_row': 'items:add',
    'add_header': 'items:add',
    'delete_row': 'items:remove-multiple',
    'copy_rows': 'items:copy',
    'move_rows': 'items:reorder',
    'reorder': 'items:reorder',
    'toggle_lock': 'lock_state'
  };
  
  return mapping[operationType];
}

/**
 * Maps operation data to broadcast payload format
 * Ensures consistent payload structure across all structural operations
 */
export function mapOperationDataToPayload(
  operationType: StructuralOperationType,
  operationData: {
    items?: RundownItem[];
    order?: string[];
    deletedIds?: string[];
    newItems?: RundownItem[];
    insertIndex?: number;
    sequenceNumber?: number;
    numberingLocked?: boolean;
    lockedRowNumbers?: { [itemId: string]: string };
  }
): any {
  switch (operationType) {
    case 'add_row':
    case 'add_header':
      // Check if this is a batch add (multiple items)
      if (operationData.newItems && operationData.newItems.length > 1) {
        // Batch add - broadcast all items (undo batch delete, redo paste)
        return {
          items: operationData.newItems,
          index: operationData.insertIndex
        };
      } else {
        // Single add - broadcast single item
        return {
          item: operationData.newItems?.[0],
          index: operationData.insertIndex
        };
      }
    
    case 'copy_rows':
      // For copy operations: { items, index }
      return {
        items: operationData.newItems,
        index: operationData.insertIndex
      };
    
    case 'delete_row':
      // For delete operations: { ids }
      return {
        ids: operationData.deletedIds
      };
    
    case 'reorder':
    case 'move_rows':
      // For reorder operations: { order }
      return {
        order: operationData.order
      };
    
    case 'toggle_lock':
      // For lock operations: { numberingLocked, lockedRowNumbers }
      return {
        numberingLocked: operationData.numberingLocked,
        lockedRowNumbers: operationData.lockedRowNumbers
      };
    
    default:
      console.warn('Unknown operation type:', operationType);
      return {};
  }
}

/**
 * Validates that an operation has the required data
 */
export function validateOperationData(
  operationType: StructuralOperationType,
  operationData: any
): boolean {
  switch (operationType) {
    case 'add_row':
    case 'add_header':
      return !!(operationData.newItems?.length > 0 && operationData.insertIndex !== undefined);
    
    case 'copy_rows':
      return !!(operationData.newItems?.length > 0 && operationData.insertIndex !== undefined);
    
    case 'delete_row':
      return !!(operationData.deletedIds?.length > 0);
    
    case 'reorder':
    case 'move_rows':
      return !!(operationData.order?.length > 0);
    
    case 'toggle_lock':
      return operationData.numberingLocked !== undefined;
    
    default:
      return false;
  }
}
