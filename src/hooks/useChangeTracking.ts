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
  const isDetectingChanges = useRef(false);

  // Initialize tracking when data is first loaded
  useEffect(() => {
    if (items && !isInitialized) {
      console.log('🎯 Initializing change tracking with', items.length, 'items');
      updateLastKnownState(items);
      setIsInitialized(true);
      
      // Set initial saved state
      const initialDataSignature = JSON.stringify({
        items,
        title: rundownTitle,
        columns,
        timezone,
        startTime
      });
      lastSavedDataRef.current = initialDataSignature;
      console.log('📋 Initial data signature set');
    }
  }, [items, isInitialized, rundownTitle, columns, timezone, startTime]);

  // Simplified change detection with debouncing
  useEffect(() => {
    if (!isInitialized || isLoading || isDetectingChanges.current) {
      return;
    }

    isDetectingChanges.current = true;

    const currentDataSignature = JSON.stringify({
      items,
      title: rundownTitle,
      columns,
      timezone,
      startTime
    });

    if (lastSavedDataRef.current && lastSavedDataRef.current !== currentDataSignature) {
      if (!hasUnsavedChanges) {
        console.log('🚨 Changes detected! Setting hasUnsavedChanges to true');
        setHasUnsavedChanges(true);
      }
    } else if (lastSavedDataRef.current === currentDataSignature && hasUnsavedChanges) {
      console.log('✅ Data matches saved state, clearing unsaved changes flag');
      setHasUnsavedChanges(false);
    }

    isDetectingChanges.current = false;
  }, [items, rundownTitle, columns, timezone, startTime, isInitialized, isLoading, hasUnsavedChanges]);

  const trackChange = useCallback((
    itemId: string, 
    field: string, 
    oldValue: string, 
    newValue: string, 
    userId?: string
  ) => {
    console.log('📝 Tracking change:', { itemId, field, oldValue, newValue });
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
    console.log('📌 Updating last known state with', items.length, 'items');
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
    console.log('💾 Marking as saved, updating signature');
    lastSavedDataRef.current = dataSignature;
    setHasUnsavedChanges(false);
    updateLastKnownState(items);
  }, [updateLastKnownState]);

  const markAsChanged = useCallback(() => {
    console.log('🔄 Manually marking as changed');
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
