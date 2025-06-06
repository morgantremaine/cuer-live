
import { useCallback, useRef, useState, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

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

export const useChangeTracking = (
  items?: RundownItem[], 
  rundownTitle?: string, 
  columns?: Column[], 
  timezone?: string, 
  startTime?: string
) => {
  const changeHistoryRef = useRef<Map<string, TrackedChange>>(new Map());
  const lastKnownStateRef = useRef<Map<string, RundownItem>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastSavedDataRef = useRef<string>('');

  // Initialize tracking when data is first loaded
  useEffect(() => {
    if (items && !isInitialized) {
      updateLastKnownState(items);
      setIsInitialized(true);
    }
  }, [items, isInitialized]);

  // Detect changes in data
  useEffect(() => {
    if (!isInitialized || isLoading) return;

    const currentDataSignature = JSON.stringify({
      items,
      title: rundownTitle,
      columns,
      timezone,
      startTime
    });

    if (lastSavedDataRef.current && lastSavedDataRef.current !== currentDataSignature) {
      setHasUnsavedChanges(true);
    }
  }, [items, rundownTitle, columns, timezone, startTime, isInitialized, isLoading]);

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

  const markAsSaved = useCallback((
    items: RundownItem[], 
    title: string, 
    columns?: Column[], 
    timezone?: string, 
    startTime?: string
  ) => {
    const dataSignature = JSON.stringify({
      items,
      title,
      columns,
      timezone,
      startTime
    });
    lastSavedDataRef.current = dataSignature;
    setHasUnsavedChanges(false);
    updateLastKnownState(items);
  }, [updateLastKnownState]);

  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  return {
    trackChange,
    detectChanges,
    getChangeHistory,
    clearChangeHistory,
    updateLastKnownState,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isInitialized,
    setIsLoading
  };
};
