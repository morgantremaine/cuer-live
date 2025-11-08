
import { UndoableOperation } from '@/types/undoOperation';
import { RundownItem } from '@/types/rundown';
import { toast } from 'sonner';

interface ReversalActions {
  updateItem: (id: string, updates: Partial<RundownItem>) => void;
  deleteRow: (id: string) => void;
  setItems: (items: RundownItem[]) => void;
  addMultipleRows: (items: RundownItem[]) => void;
}

/**
 * Reverses an operation by calling the appropriate action
 * Returns true if successful, false if the operation cannot be reversed (e.g., item was deleted)
 */
export const reverseOperation = (
  operation: UndoableOperation,
  actions: ReversalActions,
  currentItems: RundownItem[]
): boolean => {
  console.log('🔄 Reversing operation:', operation.type, operation.description);

  switch (operation.type) {
    case 'add_row':
    case 'add_header': {
      // Delete the added row
      const itemExists = currentItems.find(item => item.id === operation.data.addedItemId);
      if (!itemExists) {
        toast.error('Cannot undo: Row no longer exists');
        return false;
      }
      actions.deleteRow(operation.data.addedItemId);
      return true;
    }

    case 'delete_row': {
      // Re-insert the deleted item at its original position
      const newItems = [...currentItems];
      newItems.splice(operation.data.deletedIndex, 0, operation.data.deletedItem);
      actions.setItems(newItems);
      return true;
    }

    case 'cell_edit': {
      // Restore old values
      const itemExists = currentItems.find(item => item.id === operation.data.itemId);
      if (!itemExists) {
        toast.error('Cannot undo: Row was deleted by another user');
        return false;
      }
      actions.updateItem(operation.data.itemId, operation.data.oldValues);
      return true;
    }

    case 'reorder': {
      // Restore old order
      const reorderedItems = [...currentItems].sort((a, b) => {
        const aIndex = operation.data.oldOrder.indexOf(a.id);
        const bIndex = operation.data.oldOrder.indexOf(b.id);
        
        // Items not in old order go to the end
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        
        return aIndex - bIndex;
      });
      actions.setItems(reorderedItems);
      return true;
    }

    default:
      console.warn('Unknown operation type:', operation.type);
      return false;
  }
};

/**
 * Applies a redo operation (just reverses the reverse)
 */
export const applyOperation = (
  operation: UndoableOperation,
  actions: ReversalActions,
  currentItems: RundownItem[]
): boolean => {
  console.log('▶️ Applying operation:', operation.type, operation.description);

  switch (operation.type) {
    case 'add_row':
    case 'add_header': {
      // This shouldn't happen in redo since we deleted it in undo
      // The item should already exist, so we don't need to do anything
      return true;
    }

    case 'delete_row': {
      // Delete the item again
      const itemExists = currentItems.find(item => item.id === operation.data.deletedItem.id);
      if (!itemExists) {
        toast.error('Cannot redo: Row no longer exists');
        return false;
      }
      actions.deleteRow(operation.data.deletedItem.id);
      return true;
    }

    case 'cell_edit': {
      // Apply the new values
      const itemExists = currentItems.find(item => item.id === operation.data.itemId);
      if (!itemExists) {
        toast.error('Cannot redo: Row was deleted by another user');
        return false;
      }
      actions.updateItem(operation.data.itemId, operation.data.updates);
      return true;
    }

    case 'reorder': {
      // Restore new order
      const reorderedItems = [...currentItems].sort((a, b) => {
        const aIndex = operation.data.newOrder.indexOf(a.id);
        const bIndex = operation.data.newOrder.indexOf(b.id);
        
        // Items not in new order go to the end
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        
        return aIndex - bIndex;
      });
      actions.setItems(reorderedItems);
      return true;
    }

    default:
      console.warn('Unknown operation type:', operation.type);
      return false;
  }
};
