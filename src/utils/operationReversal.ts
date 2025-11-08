import { UndoableOperation } from '@/types/undoOperation';
import { RundownItem } from '@/hooks/useRundownItems';

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
        deleteRow(operation.data.addedItemId);
        return true;
        
      case 'delete_row':
        const newItems = [...items];
        newItems.splice(operation.data.deletedIndex, 0, operation.data.deletedItem);
        setItems(newItems);
        return true;
        
      case 'reorder':
        const reorderedItems = operation.data.oldOrder
          .map((id: string) => items.find(item => item.id === id))
          .filter(Boolean);
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
