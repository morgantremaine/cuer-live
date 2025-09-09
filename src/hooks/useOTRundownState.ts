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

    console.log('🔄 OT: Processing pending operations', ot.pendingOperations.length);
    setIsOTActive(true);

    let currentData = { items: itemsRef.current };
    
    // Apply all pending operations
    for (const operation of ot.pendingOperations) {
      try {
        currentData = ot.applyOperation(operation, currentData);
      } catch (error) {
        console.error('Error applying operation:', error, operation);
      }
    }

    // Update state with transformed data
    if (JSON.stringify(currentData.items) !== JSON.stringify(itemsRef.current)) {
      console.log('🔄 OT: Applying remote changes', {
        before: itemsRef.current.length,
        after: currentData.items.length
      });
      onItemsChange(currentData.items);
    }

    // Reset OT active state after a short delay
    setTimeout(() => setIsOTActive(false), 500);
  }, [ot.pendingOperations, ot.applyOperation, onItemsChange]);

  // Create operation for field update (per-field granularity)
  const updateField = useCallback((itemId: string, field: string, oldValue: any, newValue: any) => {
    if (!ot.isEnabled) return;

    const itemIndex = itemsRef.current.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;

    const path = `items.${itemIndex}.${field}`;
    ot.createOperation('update', path, oldValue, newValue);
    
    console.log('🔄 OT: Created field update operation', { itemId, field, path });
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