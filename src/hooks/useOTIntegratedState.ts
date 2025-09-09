/**
 * OT Integrated State Hook
 * 
 * Replaces the autosave system with OT-based collaborative editing
 */

import { useEffect, useRef, useCallback } from 'react';
import { useOTRundownState } from './useOTRundownState';
import { RundownItem } from './useRundownItems';
import { useAuth } from './useAuth';

interface UseOTIntegratedStateOptions {
  rundownId: string;
  items: RundownItem[];
  onItemsChange: (items: RundownItem[]) => void;
  onSave?: () => void;
  enabled?: boolean;
}

export const useOTIntegratedState = ({
  rundownId,
  items,
  onItemsChange,
  onSave,
  enabled = true
}: UseOTIntegratedStateOptions) => {
  const { user } = useAuth();
  const lastLocalChangeRef = useRef<number>(0);
  const isApplyingRemoteChangeRef = useRef(false);
  
  const otState = useOTRundownState({
    rundownId,
    items,
    onItemsChange: useCallback((newItems: RundownItem[]) => {
      // Mark as remote change to prevent echo
      isApplyingRemoteChangeRef.current = true;
      onItemsChange(newItems);
      
      // Clear flag after state update
      setTimeout(() => {
        isApplyingRemoteChangeRef.current = false;
      }, 100);
    }, [onItemsChange]),
    enabled: enabled && !!user
  });

  // Intercept local changes and convert to OT operations
  const interceptedOnItemsChange = useCallback((newItems: RundownItem[]) => {
    // Skip if this is a remote change being applied
    if (isApplyingRemoteChangeRef.current) {
      onItemsChange(newItems);
      return;
    }

    lastLocalChangeRef.current = Date.now();
    
    // Detect changes and create appropriate operations
    const oldItems = items;
    const newItemsArray = Array.isArray(newItems) ? newItems : [];
    
    // For now, we'll do a simple approach - create update operations for changed items
    if (oldItems.length === newItemsArray.length) {
      // Check for updates in existing items
      for (let i = 0; i < oldItems.length; i++) {
        const oldItem = oldItems[i];
        const newItem = newItemsArray[i];
        
        if (oldItem && newItem && oldItem.id === newItem.id) {
          // Check each field for changes
          Object.keys(newItem).forEach(key => {
            const typedKey = key as keyof RundownItem;
            if (oldItem[typedKey] !== newItem[typedKey]) {
              otState.updateItem(newItem.id, key, oldItem[typedKey], newItem[typedKey]);
            }
          });
        }
      }
    } else {
      // Length changed - use reorder operation for simplicity
      otState.reorderItems(newItemsArray);
    }

    // Apply change locally immediately for responsive UI
    onItemsChange(newItemsArray);
  }, [items, onItemsChange, otState]);

  // Override autosave behavior when OT is enabled
  const otEnhancedSave = useCallback(() => {
    if (otState.isOTEnabled) {
      console.log('🔄 OT: Save bypassed - using real-time operations');
      return;
    }
    
    // Fallback to regular save if OT is disabled
    onSave?.();
  }, [otState.isOTEnabled, onSave]);

  // Detect when user is actively editing a cell
  const setActiveCell = useCallback((cellId?: string) => {
    otState.setActiveCell(cellId);
  }, [otState]);

  return {
    // Enhanced handlers
    onItemsChange: interceptedOnItemsChange,
    onSave: otEnhancedSave,
    setActiveCell: otState.setActiveCell,
    
    // OT State
    isOTEnabled: otState.isOTEnabled,
    isOTActive: otState.isOTActive,
    isConnected: otState.isConnected,
    activeSessions: otState.activeSessions,
    conflictCount: otState.conflictCount,
    clientId: otState.clientId,
    
    // Utils
    shouldBypassAutosave: otState.isOTEnabled
  };
};