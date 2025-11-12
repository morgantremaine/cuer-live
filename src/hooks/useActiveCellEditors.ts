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

        const isOwnUpdate = cellBroadcast.isOwnUpdate(update, currentTabId);
        const cellKey = `${update.itemId || 'rundown'}-${update.field}`;
        
        console.log('📥 Received cell_focus:', { 
          fieldKey: cellKey, 
          isFocused: update.isFocused, 
          userName: update.userName,
          isOwnUpdate 
        });

        // Filter out own updates
        if (isOwnUpdate) return;

        setActiveEditors((prev) => {
          const next = new Map(prev);

          if (update.isFocused) {
            // Add/update active editor
            next.set(cellKey, {
              userId: update.userId,
              userName: update.userName,
              timestamp: update.timestamp
            });
            console.log('✏️ Active editors map updated:', { 
              fieldKey: cellKey, 
              editor: { userName: update.userName }, 
              totalEditors: next.size 
            });
          } else {
            // Remove editor on blur
            next.delete(cellKey);
            console.log('✏️ Active editor removed:', { fieldKey: cellKey, totalEditors: next.size });
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
      const editor = activeEditors.get(cellKey) || null;
      if (editor) {
        console.log('🔍 getEditorForCell:', { itemId, field, foundEditor: true, userName: editor.userName });
      }
      return editor;
    },
    [activeEditors]
  );

  return {
    getEditorForCell
  };
};
