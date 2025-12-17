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
  // Add refs to actual data if available
  getUndoStack?: () => any[];
  getRedoStack?: () => any[];
  getBaseline?: () => any;
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
    
    // Register undo stack (if getter provided)
    if (getUndoStack) {
      registerTrackedObject('undo-stack', () => {
        const stack = getUndoStack();
        return { data: stack, count: stack.length };
      });
    } else {
      // Fallback: just track the size
      registerTrackedObject('undo-stack', () => ({
        data: { estimatedSize: undoStackSize },
        count: undoStackSize,
      }));
    }
    
    // Register redo stack (if getter provided)
    if (getRedoStack) {
      registerTrackedObject('redo-stack', () => {
        const stack = getRedoStack();
        return { data: stack, count: stack.length };
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
    
    // Extract script fields specifically (usually largest)
    registerTrackedObject('script-fields-only', () => {
      const scripts = items
        .filter(item => item.script && item.script.length > 100)
        .map(item => ({ id: item.id, scriptLength: item.script?.length || 0 }));
      const totalScriptChars = items.reduce((sum, item) => sum + (item.script?.length || 0), 0);
      return {
        data: { totalCharacters: totalScriptChars, largeScripts: scripts.length },
        count: scripts.length,
      };
    });
    
    return () => {
      unregisterTrackedObject('rundown-items');
      unregisterTrackedObject('columns');
      unregisterTrackedObject('undo-stack');
      unregisterTrackedObject('redo-stack');
      unregisterTrackedObject('autosave-baseline');
      unregisterTrackedObject('script-fields-only');
    };
  }, [rundownId, items, columns, undoStackSize, redoStackSize, getUndoStack, getRedoStack, getBaseline]);
};
