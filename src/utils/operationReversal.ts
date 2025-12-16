import { UndoableOperation } from '@/types/undoOperation';
import { RundownItem } from '@/hooks/useRundownItems';
import { compareSortOrder } from '@/utils/fractionalIndex';

export const reverseOperation = (
  operation: UndoableOperation,
  items: RundownItem[],
  updateItem: (id: string, updates: Partial<RundownItem>) => void,
  deleteRow: (id: string) => void,
  setItems: (items: RundownItem[]) => void
): boolean => {
  try {
    switch (operation.type) {
      case 'cell_edit':
        updateItem(operation.data.itemId, { 
          [operation.data.field]: operation.data.oldValue 
        });
        return true;
        
      case 'add_row':
      case 'add_header':
        // Handle both single and batch adds
        if (operation.data.addedItemIds && Array.isArray(operation.data.addedItemIds)) {
          // Batch add reversal (paste undo) - delete multiple items
          operation.data.addedItemIds.forEach((id: string) => {
            deleteRow(id);
          });
        } else {
          // Single add reversal
          deleteRow(operation.data.addedItemId);
        }
        return true;
        
      case 'delete_row':
        // Handle both single and batch deletes
        if (operation.data.deletedItems && Array.isArray(operation.data.deletedItems)) {
          // Batch delete reversal - restore multiple items
          const newItems = [...items];
          operation.data.deletedItems.forEach((item: RundownItem, idx: number) => {
            const index = operation.data.deletedIndices[idx];
            newItems.splice(index, 0, item);
          });
          // CRITICAL: Sort by sortOrder to ensure consistent display order
          newItems.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
          setItems(newItems);
        } else {
          // Single delete reversal
          const newItems = [...items];
          newItems.splice(operation.data.deletedIndex, 0, operation.data.deletedItem);
          // CRITICAL: Sort by sortOrder to ensure consistent display order
          newItems.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
          setItems(newItems);
        }
        return true;
        
      case 'reorder':
        const reorderedItems = operation.data.oldOrder
          .map((id: string) => items.find(item => item.id === id))
          .filter(Boolean) as RundownItem[];
        // CRITICAL: Sort by sortOrder to ensure consistent display order
        reorderedItems.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
        setItems(reorderedItems);
        return true;
        
      default:
        return false;
    }
  } catch (error) {
    console.error('Error reversing operation:', error);
    return false;
  }
};

export const applyOperationForward = (
  operation: UndoableOperation,
  items: RundownItem[],
  updateItem: (id: string, updates: Partial<RundownItem>) => void,
  deleteRow: (id: string) => void,
  setItems: (items: RundownItem[]) => void
): boolean => {
  try {
    switch (operation.type) {
      case 'cell_edit':
        updateItem(operation.data.itemId, { 
          [operation.data.field]: operation.data.newValue 
        });
        return true;
        
      case 'add_row':
      case 'add_header':
        // Handle both single and batch adds
        if (operation.data.addedItems && Array.isArray(operation.data.addedItems)) {
          // Batch add forward (paste redo) - add multiple items
          const addItems = [...items];
          addItems.splice(operation.data.addedIndex, 0, ...operation.data.addedItems);
          // CRITICAL: Sort by sortOrder to ensure consistent display order
          addItems.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
          setItems(addItems);
        } else {
          // Single add forward
          const addItems = [...items];
          addItems.splice(operation.data.addedIndex, 0, operation.data.addedItem);
          // CRITICAL: Sort by sortOrder to ensure consistent display order
          addItems.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
          setItems(addItems);
        }
        return true;
        
      case 'delete_row':
        // Handle both single and batch deletes
        if (operation.data.deletedIds && Array.isArray(operation.data.deletedIds)) {
          // Batch delete forward - delete multiple items
          operation.data.deletedIds.forEach((id: string) => {
            deleteRow(id);
          });
        } else {
          // Single delete forward
          deleteRow(operation.data.deletedItem.id);
        }
        return true;
        
      case 'reorder':
        const reorderedItemsFwd = operation.data.newOrder
          .map((id: string) => items.find(item => item.id === id))
          .filter(Boolean) as RundownItem[];
        // CRITICAL: Sort by sortOrder to ensure consistent display order
        reorderedItemsFwd.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
        setItems(reorderedItemsFwd);
        return true;
        
      default:
        return false;
    }
  } catch (error) {
    console.error('Error applying operation forward:', error);
    return false;
  }
};
