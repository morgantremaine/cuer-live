import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { logger } from '@/utils/logger';

interface PerRowCompatibilityAdapterOptions {
  items: RundownItem[];
  onItemsChange: (items: RundownItem[]) => void;
  updateItem: (itemId: string, field: string, value: any) => void;
  deleteItem: (itemId: string) => void;
  addItem: (item: RundownItem, index?: number) => void;
  reorderItems: (items: RundownItem[]) => void;
  saveAllItems: () => void;
}

/**
 * Compatibility adapter that bridges per-row persistence with existing UI components.
 * This adapter translates between the new per-row API and the existing item management interface.
 */
export const usePerRowCompatibilityAdapter = ({
  items,
  onItemsChange,
  updateItem,
  deleteItem,
  addItem,
  reorderItems,
  saveAllItems
}: PerRowCompatibilityAdapterOptions) => {
  
  // Translate legacy setItems calls to per-row operations
  const setItems = useCallback((newItems: RundownItem[] | ((prev: RundownItem[]) => RundownItem[])) => {
    const resolvedItems = typeof newItems === 'function' ? newItems(items) : newItems;
    
    logger.debug('Compatibility adapter: setItems called', { 
      oldCount: items.length, 
      newCount: resolvedItems.length 
    });

    // Detect the type of change to determine the appropriate per-row operation
    const oldIds = new Set(items.map(item => item.id));
    const newIds = new Set(resolvedItems.map(item => item.id));
    
    // Check if this is a reorder operation (same items, different order)
    const isReorder = oldIds.size === newIds.size && 
      [...oldIds].every(id => newIds.has(id)) && 
      items.some((item, index) => resolvedItems[index]?.id !== item.id);
    
    if (isReorder) {
      logger.debug('Compatibility adapter: detected reorder operation');
      reorderItems(resolvedItems);
      return;
    }
    
    // Check for deletions
    const deletedIds = [...oldIds].filter(id => !newIds.has(id));
    deletedIds.forEach(id => {
      logger.debug('Compatibility adapter: deleting item', { itemId: id });
      deleteItem(id);
    });
    
    // Check for additions and updates
    resolvedItems.forEach((newItem, index) => {
      const oldItem = items.find(item => item.id === newItem.id);
      
      if (!oldItem) {
        // New item
        logger.debug('Compatibility adapter: adding new item', { itemId: newItem.id, index });
        addItem(newItem, index);
      } else {
        // Check for field changes
        const changedFields = Object.keys(newItem).filter(key => {
          const oldValue = oldItem[key as keyof RundownItem];
          const newValue = newItem[key as keyof RundownItem];
          return JSON.stringify(oldValue) !== JSON.stringify(newValue);
        });
        
        // Update changed fields
        changedFields.forEach(field => {
          logger.debug('Compatibility adapter: updating field', { 
            itemId: newItem.id, 
            field, 
            oldValue: oldItem[field as keyof RundownItem], 
            newValue: newItem[field as keyof RundownItem] 
          });
          updateItem(newItem.id, field, newItem[field as keyof RundownItem]);
        });
      }
    });
  }, [items, updateItem, deleteItem, addItem, reorderItems]);

  // Legacy updateItem wrapper that translates to per-row field updates
  const legacyUpdateItem = useCallback((itemId: string, field: string, value: any) => {
    logger.debug('Compatibility adapter: legacy updateItem', { itemId, field, value });
    updateItem(itemId, field, value);
  }, [updateItem]);

  // Legacy deleteRow wrapper
  const deleteRow = useCallback((itemId: string) => {
    logger.debug('Compatibility adapter: deleteRow', { itemId });
    deleteItem(itemId);
  }, [deleteItem]);

  // Legacy bulk operations
  const deleteMultipleItems = useCallback((itemIds: string[]) => {
    logger.debug('Compatibility adapter: deleteMultipleItems', { itemIds });
    itemIds.forEach(id => deleteItem(id));
  }, [deleteItem]);

  // Force save all items (useful for major operations)
  const markAsChanged = useCallback(() => {
    logger.debug('Compatibility adapter: markAsChanged - triggering save all');
    saveAllItems();
  }, [saveAllItems]);

  return {
    // Core compatibility methods
    setItems,
    updateItem: legacyUpdateItem,
    deleteRow,
    deleteMultipleItems,
    markAsChanged,
    
    // Direct per-row methods for components that can use them
    perRow: {
      updateItem,
      deleteItem,
      addItem,
      reorderItems,
      saveAllItems
    }
  };
};