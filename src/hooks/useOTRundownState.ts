/**
 * OT-Enhanced Rundown State Hook
 * 
 * Integrates operational transform with rundown state management
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useOperationalTransform } from './useOperationalTransform';
import { RundownItem } from './useRundownItems';

interface UseOTRundownStateOptions {
  rundownId: string;
  items: RundownItem[];
  onItemsChange: (items: RundownItem[]) => void;
  enabled?: boolean;
}

export const useOTRundownState = ({
  rundownId,
  items,
  onItemsChange,
  enabled = true
}: UseOTRundownStateOptions) => {
  const [isOTActive, setIsOTActive] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);
  const itemsRef = useRef(items);
  
  // Update items ref when items change
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const ot = useOperationalTransform({
    rundownId,
    initialData: { items },
    enabled
  });

  // Process pending operations
  useEffect(() => {
    if (ot.pendingOperations.length === 0) return;

    console.log('🔄 OT: Processing pending operations', {
      count: ot.pendingOperations.length,
      operations: ot.pendingOperations.map(op => ({ id: op.id, type: op.type, path: op.path, userId: op.userId }))
    });
    setIsOTActive(true);

    let currentData = { items: itemsRef.current };
    
    // Apply all pending operations
    for (const operation of ot.pendingOperations) {
      try {
        console.log('🔄 OT: Applying operation:', { id: operation.id, type: operation.type, path: operation.path });
        currentData = ot.applyOperation(operation, currentData);
        console.log('🔄 OT: Operation applied successfully:', operation.id);
      } catch (error) {
        console.error('❌ OT: Error applying operation:', error, operation);
      }
    }

    // Update state with transformed data
    if (JSON.stringify(currentData.items) !== JSON.stringify(itemsRef.current)) {
      console.log('🔄 OT: Applying remote changes', {
        before: itemsRef.current.length,
        after: currentData.items.length,
        changedItems: currentData.items.filter((item, index) => 
          JSON.stringify(item) !== JSON.stringify(itemsRef.current[index])
        ).length
      });
      onItemsChange(currentData.items);
    } else {
      console.log('🔄 OT: No changes detected after applying operations');
    }

    // Reset OT active state after a short delay
    setTimeout(() => setIsOTActive(false), 500);
  }, [ot.pendingOperations, ot.applyOperation, onItemsChange]);

  // Create operation for field update (per-field granularity)
  const updateField = useCallback((itemId: string, field: string, oldValue: any, newValue: any) => {
    if (!ot.isEnabled) {
      console.log('🔄 OT: Cannot update field - OT disabled', { itemId, field, isEnabled: ot.isEnabled });
      return;
    }

    const itemIndex = itemsRef.current.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      console.warn('🔄 OT: Item not found for field update:', { itemId, field, itemCount: itemsRef.current.length });
      return;
    }

    const path = `items.${itemIndex}.${field}`;
    
    console.log('🔄 OT: Creating field update operation', { 
      itemId, 
      field, 
      path, 
      oldValue, 
      newValue,
      isEnabled: ot.isEnabled,
      isConnected: ot.isConnected
    });
    
    ot.createOperation('update', path, oldValue, newValue);
  }, [ot]);

  // Create operation for item insertion
  const insertItem = useCallback((item: RundownItem, index?: number) => {
    if (!ot.isEnabled) return;

    const insertIndex = index ?? itemsRef.current.length;
    const path = `items.${insertIndex}`;
    ot.createOperation('insert', path, null, item);
    
    console.log('🔄 OT: Created insert operation', { item: item.id, index: insertIndex });
  }, [ot]);

  // Create operation for item deletion
  const deleteItem = useCallback((itemId: string) => {
    if (!ot.isEnabled) return;

    const itemIndex = itemsRef.current.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;

    const item = itemsRef.current[itemIndex];
    const path = `items.${itemIndex}`;
    ot.createOperation('delete', path, item, null);
    
    console.log('🔄 OT: Created delete operation', { itemId, index: itemIndex });
  }, [ot]);

  // Create operation for reordering
  const reorderItems = useCallback((newItems: RundownItem[]) => {
    if (!ot.isEnabled) return;

    ot.createOperation('reorder', 'items', itemsRef.current, newItems);
    console.log('🔄 OT: Created reorder operation');
  }, [ot]);

  // Update presence for active cell
  const setActiveCell = useCallback((cellId?: string) => {
    ot.updatePresence(cellId);
  }, [ot]);

  return {
    // OT State
    isOTEnabled: ot.isEnabled,
    isOTActive,
    isConnected: ot.isConnected,
    activeSessions: ot.activeSessions,
    conflictCount,
    
    // OT Actions  
    updateField,
    insertItem,
    deleteItem,
    reorderItems,
    setActiveCell,
    
    // Utils
    clientId: ot.clientId
  };
};