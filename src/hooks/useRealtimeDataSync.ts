import { useCallback, useRef, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

interface RealtimeDataSyncProps {
  items: RundownItem[];
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void;
  columns: Column[];
  handleLoadLayout: (columns: Column[]) => void;
  rundownTitle: string;
  setRundownTitleDirectly: (title: string) => void;
  timezone: string;
  setTimezoneDirectly: (timezone: string) => void;
  rundownStartTime: string;
  setRundownStartTimeDirectly: (time: string) => void;
  isEditing: boolean;
  currentUserId?: string;
}

interface RemoteUpdate {
  items?: RundownItem[];
  columns?: Column[];
  title?: string;
  timezone?: string;
  startTime?: string;
  updatedBy?: string;
  timestamp?: string;
}

export const useRealtimeDataSync = ({
  items,
  setItems,
  columns,
  handleLoadLayout,
  rundownTitle,
  setRundownTitleDirectly,
  timezone,
  setTimezoneDirectly,
  rundownStartTime,
  setRundownStartTimeDirectly,
  isEditing,
  currentUserId
}: RealtimeDataSyncProps) => {
  const lastUpdateTimestamp = useRef<string>('');
  const pendingChanges = useRef<Set<string>>(new Set());
  const mergeInProgress = useRef(false);

  // Smart merge function that preserves local changes while applying remote updates
  const mergeRemoteChanges = useCallback((remoteUpdate: RemoteUpdate) => {
    if (mergeInProgress.current) {
      console.log('Merge already in progress, skipping');
      return;
    }

    mergeInProgress.current = true;

    try {
      console.log('🔄 Merging remote changes:', {
        hasItems: !!remoteUpdate.items,
        hasColumns: !!remoteUpdate.columns,
        updatedBy: remoteUpdate.updatedBy,
        isCurrentlyEditing: isEditing
      });

      // Don't merge if user is actively editing and this is their own update
      if (isEditing && remoteUpdate.updatedBy === currentUserId) {
        console.log('⏭️ Skipping merge - user is editing their own changes');
        return;
      }

      // Merge items with conflict resolution
      if (remoteUpdate.items && Array.isArray(remoteUpdate.items)) {
        setItems(currentItems => {
          const mergedItems = [...remoteUpdate.items!];
          
          // If user has unsaved changes, preserve them
          if (isEditing && pendingChanges.current.size > 0) {
            console.log('🔀 Preserving local changes during merge');
            currentItems.forEach(localItem => {
              if (pendingChanges.current.has(localItem.id)) {
                const remoteIndex = mergedItems.findIndex(r => r.id === localItem.id);
                if (remoteIndex !== -1) {
                  // Keep local version if it was modified
                  mergedItems[remoteIndex] = localItem;
                }
              }
            });
          }
          
          return mergedItems;
        });
      }

      // Merge columns if provided
      if (remoteUpdate.columns && Array.isArray(remoteUpdate.columns)) {
        handleLoadLayout(remoteUpdate.columns);
      }

      // Update other fields if not currently being edited
      if (!isEditing) {
        if (remoteUpdate.title && remoteUpdate.title !== rundownTitle) {
          setRundownTitleDirectly(remoteUpdate.title);
        }
        
        if (remoteUpdate.timezone && remoteUpdate.timezone !== timezone) {
          setTimezoneDirectly(remoteUpdate.timezone);
        }
        
        if (remoteUpdate.startTime && remoteUpdate.startTime !== rundownStartTime) {
          setRundownStartTimeDirectly(remoteUpdate.startTime);
        }
      }

      // Update timestamp
      if (remoteUpdate.timestamp) {
        lastUpdateTimestamp.current = remoteUpdate.timestamp;
      }

    } catch (error) {
      console.error('❌ Error merging remote changes:', error);
    } finally {
      mergeInProgress.current = false;
    }
  }, [
    setItems,
    handleLoadLayout,
    setRundownTitleDirectly,
    setTimezoneDirectly,
    setRundownStartTimeDirectly,
    isEditing,
    currentUserId,
    rundownTitle,
    timezone,
    rundownStartTime
  ]);

  // Track pending local changes
  const trackPendingChange = useCallback((itemId: string) => {
    pendingChanges.current.add(itemId);
    
    // Clear after a delay (when presumably saved)
    setTimeout(() => {
      pendingChanges.current.delete(itemId);
    }, 5000);
  }, []);

  // Clear all pending changes (call after successful save)
  const clearPendingChanges = useCallback(() => {
    pendingChanges.current.clear();
  }, []);

  // Check if we should accept a remote update
  const shouldAcceptUpdate = useCallback((updateTimestamp: string) => {
    if (!lastUpdateTimestamp.current) return true;
    return updateTimestamp > lastUpdateTimestamp.current;
  }, []);

  return {
    mergeRemoteChanges,
    trackPendingChange,
    clearPendingChanges,
    shouldAcceptUpdate,
    hasPendingChanges: pendingChanges.current.size > 0
  };
};
