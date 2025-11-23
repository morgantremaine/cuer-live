import { useState, useEffect, useCallback } from 'react';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { getTabId } from '@/utils/tabUtils';

interface ActiveEditor {
  userId: string;
  userName: string;
  timestamp: number;
  isActive: boolean; // true = currently focused, false = recently blurred
}

const GRACE_PERIOD = 5000; // 5 seconds - keep editors after blur for autoscroll
const STALE_TIMEOUT = 120000; // 120 seconds - safety net for disconnects/crashes

/**
 * Hook to track which users are actively editing which cells
 * Displays visual indicators showing real-time cell focus states
 */
export const useActiveCellEditors = (rundownId: string | null) => {
  const [activeEditors, setActiveEditors] = useState<Map<string, ActiveEditor>>(new Map());

  useEffect(() => {
    if (!rundownId) return;

    const currentTabId = getTabId();
    console.log('🔧 useActiveCellEditors mounted', { rundownId, currentTabId });

    // Subscribe to cell focus broadcasts
    const unsubscribe = cellBroadcast.subscribeToCellUpdates(
      rundownId,
      (update: any) => {
        console.log('📡 Cell update received:', update);
        
        // Only process focus events
        if (!update.userName || update.isFocused === undefined) {
          console.log('⏭️ Skipping update - missing userName or isFocused');
          return;
        }

        const isOwnUpdate = cellBroadcast.isOwnUpdate(update, currentTabId);
        const cellKey = `${update.itemId || 'rundown'}-${update.field}`;

        console.log('🔍 Processing update:', {
          cellKey,
          isOwnUpdate,
          isFocused: update.isFocused,
          userName: update.userName,
          userId: update.userId
        });

        // Filter out own updates
        if (isOwnUpdate) {
          console.log('⏭️ Skipping own update');
          return;
        }

        setActiveEditors((prev) => {
          const next = new Map(prev);

          if (update.isFocused) {
            // Add/update active editor
            console.log(`✅ Adding editor to Map: ${cellKey} -> ${update.userName}`);
            next.set(cellKey, {
              userId: update.userId,
              userName: update.userName,
              timestamp: update.timestamp,
              isActive: true
            });
          } else {
            // Keep editor in map but mark as inactive (for grace period)
            const existing = next.get(cellKey);
            if (existing) {
              console.log(`⏸️ Marking editor as inactive in Map: ${cellKey}`);
              next.set(cellKey, {
                ...existing,
                timestamp: update.timestamp,
                isActive: false
              });
            }
          }

          console.log('📊 activeEditors Map after update:', {
            size: next.size,
            entries: Array.from(next.entries()).map(([key, value]) => ({
              cellKey: key,
              userName: value.userName,
              userId: value.userId
            }))
          });

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
        const staleEditors: string[] = [];

        for (const [cellKey, editor] of next.entries()) {
          const age = now - editor.timestamp;
          
          if (editor.isActive) {
            // Remove actively editing cells after STALE_TIMEOUT
            if (age > STALE_TIMEOUT) {
              next.delete(cellKey);
              staleEditors.push(`${cellKey} (${editor.userName}) - stale`);
              changed = true;
            }
          } else {
            // Remove inactive (blurred) cells after GRACE_PERIOD
            if (age > GRACE_PERIOD) {
              next.delete(cellKey);
              staleEditors.push(`${cellKey} (${editor.userName}) - grace period expired`);
              changed = true;
            }
          }
        }

        if (staleEditors.length > 0) {
          console.log('🧹 Cleaned up editors:', staleEditors);
        }

        return changed ? next : prev;
      });
    }, 1000); // Check every second

    return () => {
      console.log('🔧 useActiveCellEditors unmounting');
      unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, [rundownId]);

  // Get the active editor for a specific cell
  const getEditorForCell = useCallback(
    (itemId: string | undefined, field: string): ActiveEditor | null => {
      const cellKey = `${itemId || 'rundown'}-${field}`;
      const editor = activeEditors.get(cellKey) || null;
      
      console.log('🔍 getEditorForCell called:', {
        cellKey,
        found: !!editor,
        editor: editor ? { userName: editor.userName, userId: editor.userId } : null,
        mapSize: activeEditors.size,
        allKeys: Array.from(activeEditors.keys())
      });
      
      return editor;
    },
    [activeEditors]
  );

  return {
    getEditorForCell
  };
};
