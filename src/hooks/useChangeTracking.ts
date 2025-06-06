
import { useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

interface ChangeMetadata {
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: number;
  userId?: string;
}

interface TrackedChange {
  itemId: string;
  changes: ChangeMetadata[];
  lastModifiedBy?: string;
  lastModifiedAt: number;
}

export const useChangeTracking = () => {
  const changeHistoryRef = useRef<Map<string, TrackedChange>>(new Map());
  const lastKnownStateRef = useRef<Map<string, RundownItem>>(new Map());

  const trackChange = useCallback((
    itemId: string, 
    field: string, 
    oldValue: string, 
    newValue: string, 
    userId?: string
  ) => {
    const timestamp = Date.now();
    const change: ChangeMetadata = {
      field,
      oldValue,
      newValue,
      timestamp,
      userId
    };

    changeHistoryRef.current.set(itemId, {
      itemId,
      changes: [change], // Keep only the latest change for simplicity
      lastModifiedBy: userId,
      lastModifiedAt: timestamp
    });
  }, []);

  const detectChanges = useCallback((items: RundownItem[], currentUserId?: string) => {
    const detectedChanges: TrackedChange[] = [];

    items.forEach(item => {
      const lastKnownItem = lastKnownStateRef.current.get(item.id);
      
      if (lastKnownItem) {
        const changes: ChangeMetadata[] = [];
        
        // Check each field for changes
        Object.keys(item).forEach(field => {
          if (field === 'id') return; // Skip ID field
          
          const oldValue = String(lastKnownItem[field as keyof RundownItem] || '');
          const newValue = String(item[field as keyof RundownItem] || '');
          
          if (oldValue !== newValue) {
            changes.push({
              field,
              oldValue,
              newValue,
              timestamp: Date.now(),
              userId: currentUserId
            });
          }
        });

        if (changes.length > 0) {
          detectedChanges.push({
            itemId: item.id,
            changes,
            lastModifiedBy: currentUserId,
            lastModifiedAt: Date.now()
          });
        }
      }

      // Update last known state
      lastKnownStateRef.current.set(item.id, { ...item });
    });

    return detectedChanges;
  }, []);

  const getChangeHistory = useCallback((itemId: string): TrackedChange | undefined => {
    return changeHistoryRef.current.get(itemId);
  }, []);

  const clearChangeHistory = useCallback((itemId?: string) => {
    if (itemId) {
      changeHistoryRef.current.delete(itemId);
    } else {
      changeHistoryRef.current.clear();
    }
  }, []);

  const updateLastKnownState = useCallback((items: RundownItem[]) => {
    items.forEach(item => {
      lastKnownStateRef.current.set(item.id, { ...item });
    });
  }, []);

  return {
    trackChange,
    detectChanges,
    getChangeHistory,
    clearChangeHistory,
    updateLastKnownState
  };
};
