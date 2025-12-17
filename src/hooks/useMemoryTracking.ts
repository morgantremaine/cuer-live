/**
 * Hook to register rundown state objects for memory diagnostics
 */
import { useEffect } from 'react';
import { registerTrackedObject, unregisterTrackedObject } from '@/utils/memoryDiagnostics';
import { RundownItem } from '@/types/rundown';

interface UseMemoryTrackingProps {
  items: RundownItem[];
  undoStackSize: number;
  redoStackSize: number;
  rundownId: string | null;
  columns: any[];
  // Getters for actual data (for accurate size estimation)
  getUndoStack?: () => any[];
  getRedoStack?: () => any[];
  getBaseline?: () => any;
  getTypingSessionsCount?: () => number;
  // Refs for internal state tracking
  recentlyEditedFieldsRef?: React.MutableRefObject<Map<string, number>>;
  dropdownFieldProtectionRef?: React.MutableRefObject<Map<string, number>>;
  recentDragOperationsRef?: React.MutableRefObject<Map<string, any>>;
}

export const useMemoryTracking = ({
  items,
  undoStackSize,
  redoStackSize,
  rundownId,
  columns,
  getUndoStack,
  getRedoStack,
  getBaseline,
  getTypingSessionsCount,
  recentlyEditedFieldsRef,
  dropdownFieldProtectionRef,
  recentDragOperationsRef,
}: UseMemoryTrackingProps) => {
  
  useEffect(() => {
    if (!rundownId) return;
    
    // Register items array
    registerTrackedObject('rundown-items', () => ({
      data: items,
      count: items.length,
    }));
    
    // Register columns
    registerTrackedObject('columns', () => ({
      data: columns,
      count: columns.length,
    }));
    
    // Register undo stack (with actual data if getter provided)
    if (getUndoStack) {
      registerTrackedObject('undo-stack', () => {
        const stack = getUndoStack();
        return { 
          data: stack, 
          count: stack.length,
          details: stack.length > 0 ? `types: ${stack.map((op: any) => op.type).join(', ')}` : undefined
        };
      });
    } else {
      registerTrackedObject('undo-stack', () => ({
        data: { estimatedSize: undoStackSize },
        count: undoStackSize,
      }));
    }
    
    // Register redo stack (with actual data if getter provided)
    if (getRedoStack) {
      registerTrackedObject('redo-stack', () => {
        const stack = getRedoStack();
        return { 
          data: stack, 
          count: stack.length,
          details: stack.length > 0 ? `types: ${stack.map((op: any) => op.type).join(', ')}` : undefined
        };
      });
    } else {
      registerTrackedObject('redo-stack', () => ({
        data: { estimatedSize: redoStackSize },
        count: redoStackSize,
      }));
    }
    
    // Register baseline (if getter provided)
    if (getBaseline) {
      registerTrackedObject('autosave-baseline', () => {
        const baseline = getBaseline();
        return { 
          data: baseline, 
          count: baseline?.items?.length || 0 
        };
      });
    }
    
    // Track actual script content for accurate size estimation
    registerTrackedObject('script-fields', () => {
      const allScripts = items
        .filter(item => item.script && item.script.length > 0)
        .map(item => item.script);
      const totalChars = allScripts.reduce((sum, s) => sum + (s?.length || 0), 0);
      return {
        data: allScripts, // Track actual content for size estimation
        count: allScripts.length,
        details: `${totalChars.toLocaleString()} total chars`
      };
    });
    
    // Track typing sessions count
    if (getTypingSessionsCount) {
      registerTrackedObject('typing-sessions', () => {
        const count = getTypingSessionsCount();
        return {
          data: { activeCount: count },
          count,
          details: count > 0 ? 'active typing batches' : undefined
        };
      });
    }
    
    // Track recently edited fields map
    if (recentlyEditedFieldsRef) {
      registerTrackedObject('recently-edited-fields', () => {
        const map = recentlyEditedFieldsRef.current;
        return {
          data: Object.fromEntries(map),
          count: map.size,
          details: map.size > 0 ? `oldest: ${Math.round((Date.now() - Math.min(...map.values())) / 1000)}s ago` : undefined
        };
      });
    }
    
    // Track dropdown protection map
    if (dropdownFieldProtectionRef) {
      registerTrackedObject('dropdown-protection', () => {
        const map = dropdownFieldProtectionRef.current;
        return {
          data: Object.fromEntries(map),
          count: map.size,
        };
      });
    }
    
    // Track recent drag operations
    if (recentDragOperationsRef) {
      registerTrackedObject('recent-drag-ops', () => {
        const map = recentDragOperationsRef.current;
        return {
          data: Object.fromEntries(map),
          count: map.size,
        };
      });
    }
    
    return () => {
      unregisterTrackedObject('rundown-items');
      unregisterTrackedObject('columns');
      unregisterTrackedObject('undo-stack');
      unregisterTrackedObject('redo-stack');
      unregisterTrackedObject('autosave-baseline');
      unregisterTrackedObject('script-fields');
      unregisterTrackedObject('typing-sessions');
      unregisterTrackedObject('recently-edited-fields');
      unregisterTrackedObject('dropdown-protection');
      unregisterTrackedObject('recent-drag-ops');
    };
  }, [rundownId, items, columns, undoStackSize, redoStackSize, getUndoStack, getRedoStack, getBaseline, getTypingSessionsCount, recentlyEditedFieldsRef, dropdownFieldProtectionRef, recentDragOperationsRef]);
};
