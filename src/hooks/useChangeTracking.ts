
import { useState, useEffect, useRef, useMemo } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const initOnceRef = useRef(false);

  // Simple signature for tracking changes
  const currentSignature = useMemo(() => {
    return JSON.stringify({ 
      title: rundownTitle || '',
      itemsCount: items.length,
      columnsCount: columns?.length || 0,
      timezone: timezone || '', 
      startTime: startTime || ''
    });
  }, [items.length, rundownTitle, columns?.length, timezone, startTime]);

  // Initialize only once when we have data
  useEffect(() => {
    if (!initOnceRef.current && items.length > 0) {
      console.log('Change tracking: Initializing once');
      lastSavedDataRef.current = currentSignature;
      setIsInitialized(true);
      setHasUnsavedChanges(false);
      initOnceRef.current = true;
    }
  }, [currentSignature, items.length]);

  // Track changes after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const hasChanges = lastSavedDataRef.current !== currentSignature;
    setHasUnsavedChanges(hasChanges);
  }, [currentSignature, isInitialized]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = JSON.stringify({ 
      title: savedTitle || '',
      itemsCount: savedItems.length,
      columnsCount: savedColumns?.length || 0, 
      timezone: savedTimezone || '', 
      startTime: savedStartTime || ''
    });
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
    console.log('Change tracking: Marked as saved');
  };

  const markAsChanged = () => {
    if (isInitialized) {
      setHasUnsavedChanges(true);
    }
  };

  return {
    hasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isInitialized
  };
};
