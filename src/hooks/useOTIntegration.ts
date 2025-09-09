/**
 * OT Integration Hook
 * 
 * Integrates operational transform with existing rundown and blueprint systems
 * Replaces traditional autosave with collaborative OT operations
 */

import { useEffect, useCallback, useRef } from 'react';
import { useOperationalTransform } from './useOperationalTransform';
import { useRealtimeOT } from './useRealtimeOT';
import { useBlueprintContext } from '@/contexts/BlueprintContext';
import { RundownItem } from '@/types/rundown';
import { logger } from '@/utils/logger';

interface UseOTIntegrationProps {
  rundownId: string;
  rundownData: any;
  enabled?: boolean;
}

export const useOTIntegration = ({ 
  rundownId, 
  rundownData, 
  enabled = true 
}: UseOTIntegrationProps) => {
  const otHook = useOperationalTransform({
    rundownId,
    initialData: rundownData,
    enabled
  });

  const realtimeOT = useRealtimeOT({
    rundownId,
    enabled: enabled && otHook.isReady
  });

  const blueprintContext = useBlueprintContext();
  const lastBlueprintStateRef = useRef<any>(null);
  const processingOTUpdateRef = useRef(false);

  // Wrap field updates with OT operations
  const updateFieldWithOT = useCallback(async (
    targetId: string,
    field: string,
    newValue: any,
    oldValue: any
  ) => {
    if (!otHook.isReady) {
    logger.info('OT not ready, falling back to direct update');
      return false;
    }

    logger.info('Updating field with OT:', { targetId, field, newValue, oldValue });
    
    // Start editing session
    const context = otHook.startEditing(targetId, field, oldValue);
    
    try {
      // Submit field update operation
      const success = await otHook.updateField(targetId, field, newValue, oldValue);
      
      if (success) {
        // Broadcast to other users
        await realtimeOT.broadcastOperation({
          id: { userId: '', timestamp: Date.now(), sequence: 0 },
          type: 'field_update',
          targetId,
          field,
          userId: '',
          timestamp: Date.now(),
          vectorClock: {},
          newValue,
          oldValue,
          dataType: typeof newValue
        } as any);
        
        logger.info('Field update successful');
        return true;
      } else {
        logger.info('Field update failed');
        return false;
      }
    } finally {
      // Stop editing session
      otHook.stopEditing(targetId, field);
    }
  }, [otHook, realtimeOT]);

  // Wrap text updates with OT operations
  const updateTextWithOT = useCallback(async (
    targetId: string,
    field: string,
    newText: string,
    oldText: string
  ) => {
    if (!otHook.isReady) {
      logger.info('OT not ready, falling back to direct update');
      return false;
    }

    // Calculate the difference between old and new text
    const { operation, success } = calculateTextOperation(oldText, newText);
    
    if (!success || !operation) {
      logger.info('Could not calculate text operation, using field update');
      return updateFieldWithOT(targetId, field, newText, oldText);
    }

    logger.info('Updating text with OT:', { targetId, field, operation });
    
    // Start editing session
    const context = otHook.startEditing(targetId, field, oldText);
    
    try {
      let result = false;
      
      switch (operation.type) {
        case 'insert':
          result = await otHook.insertText(targetId, field, operation.position, operation.content);
          break;
        case 'delete':
          result = await otHook.deleteText(targetId, field, operation.position, operation.length, operation.deletedContent);
          break;
        case 'replace':
          result = await otHook.replaceText(targetId, field, operation.position, operation.length, operation.newContent, operation.oldContent);
          break;
      }
      
      if (result) {
        logger.info('Text update successful');
        return true;
      } else {
        logger.info('Text update failed');
        return false;
      }
    } finally {
      // Stop editing session
      otHook.stopEditing(targetId, field);
    }
  }, [otHook, updateFieldWithOT]);

  // Replace blueprint context operations with OT-enabled versions
  const otEnabledBlueprintOps = useCallback(() => {
    if (!otHook.isReady) {
      return blueprintContext;
    }

    return {
      ...blueprintContext,
      
      updateLists: async (lists: any[]) => {
        const success = await updateFieldWithOT('rundown', 'blueprint_lists', lists, blueprintContext.state.lists);
        if (!success) {
          // Fallback to original method
          blueprintContext.updateLists(lists);
        }
      },
      
      updateShowDate: async (date: string) => {
        const success = await updateFieldWithOT('rundown', 'show_date', date, blueprintContext.state.showDate);
        if (!success) {
          blueprintContext.updateShowDate(date);
        }
      },
      
      updateNotes: async (notes: string) => {
        const success = await updateTextWithOT('rundown', 'notes', notes, blueprintContext.state.notes);
        if (!success) {
          blueprintContext.updateNotes(notes);
        }
      },
      
      updateCheckedItems: async (listId: string, checkedItems: Record<string, boolean>) => {
        const currentList = blueprintContext.state.lists.find(l => l.id === listId);
        const success = await updateFieldWithOT(listId, 'checkedItems', checkedItems, currentList?.checkedItems || {});
        if (!success) {
          blueprintContext.updateCheckedItems(listId, checkedItems);
        }
      }
    };
  }, [otHook.isReady, blueprintContext, updateFieldWithOT, updateTextWithOT]);

  // Handle incoming OT operations and sync with blueprint state
  useEffect(() => {
    if (!otHook.isReady || processingOTUpdateRef.current) return;

    const currentSnapshot = otHook.activeSessions;
    
    // Check if there are updates from OT that need to be reflected in blueprint state
    // This will be expanded as we integrate more deeply
    
  }, [otHook.isReady, otHook.activeSessions]);

  return {
    // OT state
    ...otHook,
    
    // Real-time capabilities
    isConnected: realtimeOT.isConnected,
    
    // Enhanced blueprint operations
    blueprintOps: otEnabledBlueprintOps(),
    
    // Direct OT operations for advanced use
    updateFieldWithOT,
    updateTextWithOT,
    
    // Indicators
    isOTEnabled: otHook.isReady && enabled
  };
};

// Helper function to calculate text operations
function calculateTextOperation(oldText: string, newText: string): {
  operation: any;
  success: boolean;
} {
  // Simple diff algorithm - find first difference
  let i = 0;
  while (i < Math.min(oldText.length, newText.length) && oldText[i] === newText[i]) {
    i++;
  }
  
  if (i === oldText.length && i === newText.length) {
    // No change
    return { operation: null, success: false };
  }
  
  if (i === oldText.length) {
    // Pure insertion at end
    return {
      operation: {
        type: 'insert',
        position: i,
        content: newText.slice(i)
      },
      success: true
    };
  }
  
  if (i === newText.length) {
    // Pure deletion from position
    return {
      operation: {
        type: 'delete',
        position: i,
        length: oldText.length - i,
        deletedContent: oldText.slice(i)
      },
      success: true
    };
  }
  
  // Find end of common suffix
  let j = 0;
  while (j < Math.min(oldText.length - i, newText.length - i) && 
         oldText[oldText.length - 1 - j] === newText[newText.length - 1 - j]) {
    j++;
  }
  
  const deletedLength = oldText.length - i - j;
  const insertedContent = newText.slice(i, newText.length - j);
  
  if (deletedLength === 0) {
    // Pure insertion
    return {
      operation: {
        type: 'insert',
        position: i,
        content: insertedContent
      },
      success: true
    };
  }
  
  if (insertedContent.length === 0) {
    // Pure deletion
    return {
      operation: {
        type: 'delete',
        position: i,
        length: deletedLength,
        deletedContent: oldText.slice(i, i + deletedLength)
      },
      success: true
    };
  }
  
  // Replace operation
  return {
    operation: {
      type: 'replace',
      position: i,
      length: deletedLength,
      newContent: insertedContent,
      oldContent: oldText.slice(i, i + deletedLength)
    },
    success: true
  };
}