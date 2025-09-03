import { useState, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { usePerRowPersistence } from './usePerRowPersistence';
import { usePerRowRealtime } from './usePerRowRealtime';
import { logger } from '@/utils/logger';

interface UsePerRowRundownStateOptions {
  rundownId: string;
  initialItems?: RundownItem[];
  enableRealtime?: boolean;
}

export const usePerRowRundownState = ({ 
  rundownId, 
  initialItems = [], 
  enableRealtime = true 
}: UsePerRowRundownStateOptions) => {
  const [items, setItems] = useState<RundownItem[]>(initialItems);
  const [isInitialized, setIsInitialized] = useState(false);
  const protectedItemsRef = useRef<Set<string>>(new Set());
  const editingTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const persistence = usePerRowPersistence({
    rundownId,
    onItemsChange: setItems
  });

  // Handle realtime updates with protection for actively edited items
  const handleRealtimeUpdate = useCallback((realtimeItems: RundownItem[]) => {
    if (!isInitialized) {
      // First load - accept all items
      setItems(realtimeItems);
      setIsInitialized(true);
      return;
    }

    // Merge realtime updates with protected items
    setItems(currentItems => {
      const mergedItems = [...realtimeItems];
      
      // Preserve locally protected items
      currentItems.forEach((currentItem, index) => {
        if (protectedItemsRef.current.has(currentItem.id)) {
          // Find corresponding item in realtime data
          const realtimeIndex = realtimeItems.findIndex(item => item.id === currentItem.id);
          if (realtimeIndex >= 0) {
            // Keep local version of protected item
            mergedItems[realtimeIndex] = currentItem;
          }
        }
      });

      return mergedItems;
    });
  }, [isInitialized]);

  usePerRowRealtime({
    rundownId,
    onItemsChange: handleRealtimeUpdate,
    enabled: enableRealtime
  });

  // Protect item from being overwritten by realtime updates
  const protectItem = useCallback((itemId: string, duration = 30000) => {
    protectedItemsRef.current.add(itemId);
    
    // Clear existing timer
    if (editingTimersRef.current[itemId]) {
      clearTimeout(editingTimersRef.current[itemId]);
    }

    // Set new timer to unprotect
    editingTimersRef.current[itemId] = setTimeout(() => {
      protectedItemsRef.current.delete(itemId);
      delete editingTimersRef.current[itemId];
    }, duration);

    logger.debug('Protected item from realtime updates:', { itemId, duration });
  }, []);

  // Update single item
  const updateItem = useCallback((itemId: string, updates: Partial<RundownItem>) => {
    setItems(currentItems => {
      const newItems = currentItems.map((item, index) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, ...updates };
          
          // Protect item during edit
          protectItem(itemId);
          
          // Save to database
          persistence.debouncedSaveItem(updatedItem, index);
          
          return updatedItem;
        }
        return item;
      });
      return newItems;
    });
  }, [protectItem, persistence]);

  // Add new item
  const addItem = useCallback((item: RundownItem, index?: number) => {
    setItems(currentItems => {
      const insertIndex = index !== undefined ? index : currentItems.length;
      const newItems = [...currentItems];
      newItems.splice(insertIndex, 0, item);
      
      // Save all items to update indices
      persistence.saveItems(newItems);
      
      return newItems;
    });
  }, [persistence]);

  // Delete item
  const deleteItem = useCallback((itemId: string) => {
    setItems(currentItems => {
      const newItems = currentItems.filter(item => item.id !== itemId);
      
      // Delete from database and reorder remaining items
      persistence.deleteItem(itemId);
      persistence.reorderItems(newItems);
      
      // Clear protection
      protectedItemsRef.current.delete(itemId);
      if (editingTimersRef.current[itemId]) {
        clearTimeout(editingTimersRef.current[itemId]);
        delete editingTimersRef.current[itemId];
      }
      
      return newItems;
    });
  }, [persistence]);

  // Reorder items
  const reorderItems = useCallback((newItems: RundownItem[]) => {
    setItems(newItems);
    persistence.reorderItems(newItems);
  }, [persistence]);

  // Force save all items
  const saveAllItems = useCallback(() => {
    persistence.saveItems(items);
  }, [persistence, items]);

  // Initialize from database
  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      const loadedItems = await persistence.loadItems();
      setItems(loadedItems);
      setIsInitialized(true);
      logger.debug('Initialized per-row rundown state:', { count: loadedItems.length });
    } catch (error) {
      logger.error('Failed to initialize per-row rundown state:', error);
      setIsInitialized(true); // Don't block UI
    }
  }, [persistence, isInitialized]);

  return {
    items,
    isInitialized,
    updateItem,
    addItem,
    deleteItem,
    reorderItems,
    saveAllItems,
    initialize,
    protectItem,
    isSaving: persistence.isSaving,
    migrateRundown: persistence.migrateRundown
  };
};
