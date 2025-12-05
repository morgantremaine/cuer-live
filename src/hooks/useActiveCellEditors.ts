import { useState, useEffect, useCallback, useRef } from 'react';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { getTabId } from '@/utils/tabUtils';
import { broadcastBatcher } from '@/utils/broadcastBatcher';

interface ActiveEditor {
  userId: string;
  userName: string;
  timestamp: number;
}

const STALE_TIMEOUT = 10000; // 10 seconds - safety net for disconnects/crashes
const CLEANUP_INTERVAL = 2000; // Check every 2 seconds instead of 1

/**
 * Hook to track which users are actively editing which cells
 * Uses batched updates to reduce memory pressure with many concurrent users
 */
export const useActiveCellEditors = (
  rundownId: string | null,
  activeUserCount: number = 1
) => {
  const [activeEditors, setActiveEditors] = useState<Map<string, ActiveEditor>>(new Map());
  const batchProcessorRegistered = useRef(false);

  // Update batcher and cellBroadcast with user count for adaptive throttling
  useEffect(() => {
    broadcastBatcher.setActiveUserCount(activeUserCount);
    cellBroadcast.setActiveUserCount(activeUserCount);
  }, [activeUserCount]);

  useEffect(() => {
    if (!rundownId) return;

    const currentTabId = getTabId();

    // Register batch processor once
    if (!batchProcessorRegistered.current) {
      broadcastBatcher.registerProcessor('focus', (updates) => {
        // Process all queued focus updates in a single state update
        setActiveEditors((prev) => {
          const next = new Map(prev);
          let changed = false;

          for (const update of updates) {
            const { key, data } = update;
            
            if (data.isFocused && data.editor) {
              const existing = next.get(key);
              // Only update if newer or not existing
              if (!existing || data.editor.timestamp > existing.timestamp) {
                next.set(key, data.editor);
                changed = true;
              }
            } else {
              if (next.has(key)) {
                next.delete(key);
                changed = true;
              }
            }
          }

          return changed ? next : prev;
        });
      });
      batchProcessorRegistered.current = true;
    }

    // Subscribe to cell focus broadcasts
    const unsubscribe = cellBroadcast.subscribeToCellUpdates(
      rundownId,
      (update: any) => {
        // Only process focus events
        if (!update.userName || update.isFocused === undefined) return;

        const isOwnUpdate = cellBroadcast.isOwnUpdate(update, currentTabId);
        const cellKey = `${update.itemId || 'rundown'}-${update.field}`;

        // Filter out own updates
        if (isOwnUpdate) return;

        // Queue update for batched processing
        broadcastBatcher.queue('focus', cellKey, {
          isFocused: update.isFocused,
          editor: update.isFocused ? {
            userId: update.userId,
            userName: update.userName,
            timestamp: update.timestamp
          } : null
        });
      },
      currentTabId
    );

    // Cleanup stale editors periodically (less frequently)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setActiveEditors((prev) => {
        // First check if any cleanup is actually needed (avoid creating Map unnecessarily)
        let hasStale = false;
        for (const [, editor] of prev.entries()) {
          if (now - editor.timestamp > STALE_TIMEOUT) {
            hasStale = true;
            break;
          }
        }
        
        // Only create new Map if there are stale entries to remove
        if (!hasStale) return prev;

        const next = new Map(prev);
        for (const [cellKey, editor] of next.entries()) {
          if (now - editor.timestamp > STALE_TIMEOUT) {
            next.delete(cellKey);
          }
        }

        return next;
      });
    }, CLEANUP_INTERVAL);

    return () => {
      unsubscribe();
      clearInterval(cleanupInterval);
      // Clean up batcher processor to prevent memory leaks from stale closures
      broadcastBatcher.unregisterProcessor('focus');
    };
  }, [rundownId]);

  // Get the active editor for a specific cell
  const getEditorForCell = useCallback(
    (itemId: string | undefined, field: string): ActiveEditor | null => {
      const cellKey = `${itemId || 'rundown'}-${field}`;
      return activeEditors.get(cellKey) || null;
    },
    [activeEditors]
  );

  // Get all active editors (for finding teammate locations)
  const getAllActiveEditors = useCallback((): Array<{
    cellKey: string;
    itemId: string;
    field: string;
    editor: ActiveEditor;
  }> => {
    return Array.from(activeEditors.entries()).map(([cellKey, editor]) => {
      // Parse cellKey format: "itemId-field" or "rundown-field"
      const [itemId, ...fieldParts] = cellKey.split('-');
      const field = fieldParts.join('-'); // Handle fields with dashes
      return { cellKey, itemId, field, editor };
    });
  }, [activeEditors]);

  return {
    getEditorForCell,
    getAllActiveEditors,
    activeEditorCount: activeEditors.size
  };
};
