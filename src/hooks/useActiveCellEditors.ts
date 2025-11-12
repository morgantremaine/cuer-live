import { useState, useEffect, useCallback } from 'react';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { getTabId } from '@/utils/tabUtils';

interface ActiveEditor {
  userId: string;
  userName: string;
  timestamp: number;
}

const STALE_TIMEOUT = 3000; // 3 seconds - matches useEditingState timeout

/**
 * Hook to track which users are actively editing which cells
 * Displays visual indicators showing real-time cell focus states
 */
export const useActiveCellEditors = (rundownId: string | null) => {
  const [activeEditors, setActiveEditors] = useState<Map<string, ActiveEditor>>(new Map());

  useEffect(() => {
    if (!rundownId) return;

    const currentTabId = getTabId();

    // Subscribe to cell focus broadcasts
    const unsubscribe = cellBroadcast.subscribeToCellUpdates(
      rundownId,
      (update: any) => {
        // Only process focus events
        if (!update.userName || update.isFocused === undefined) return;

        // Filter out own updates
        if (cellBroadcast.isOwnUpdate(update, currentTabId)) return;

        const cellKey = `${update.itemId || 'rundown'}-${update.field}`;

        setActiveEditors((prev) => {
          const next = new Map(prev);

          if (update.isFocused) {
            // Add/update active editor
            next.set(cellKey, {
              userId: update.userId,
              userName: update.userName,
              timestamp: update.timestamp
            });
          } else {
            // Remove editor on blur
            next.delete(cellKey);
          }

          return next;
        });
      },
      currentTabId
    );

    // Cleanup stale editors periodically
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setActiveEditors((prev) => {
        const next = new Map(prev);
        let changed = false;

        for (const [cellKey, editor] of next.entries()) {
          if (now - editor.timestamp > STALE_TIMEOUT) {
            next.delete(cellKey);
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, 1000); // Check every second

    return () => {
      unsubscribe();
      clearInterval(cleanupInterval);
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

  return {
    getEditorForCell
  };
};
