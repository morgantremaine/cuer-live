
import { useState, useEffect, useRef, useMemo } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const initializationRef = useRef(false);

  // Create a signature for tracking changes
  const currentSignature = useMemo(() => {
    return JSON.stringify({ 
      itemsCount: items.length,
      title: rundownTitle, 
      columnsCount: columns?.length || 0,
      timezone: timezone || '', 
      startTime: startTime || '',
      itemsHash: items.map(item => `${item.id}-${item.name || item.segmentName || ''}-${item.type}`).join('|')
    });
  }, [items, rundownTitle, columns, timezone, startTime]);

  // Initialize ONCE when we have meaningful data
  useEffect(() => {
    if (!initializationRef.current && items.length > 0) {
      console.log('Change tracking: Initializing once');
      lastSavedDataRef.current = currentSignature;
      setIsInitialized(true);
      setHasUnsavedChanges(false);
      initializationRef.current = true;
    }
  }, [currentSignature, items.length]);

  // Track changes after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const hasChanges = lastSavedDataRef.current !== currentSignature;
    if (hasChanges !== hasUnsavedChanges) {
      setHasUnsavedChanges(hasChanges);
    }
  }, [currentSignature, isInitialized, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = JSON.stringify({ 
      itemsCount: savedItems.length,
      title: savedTitle, 
      columnsCount: savedColumns?.length || 0, 
      timezone: savedTimezone || '', 
      startTime: savedStartTime || '',
      itemsHash: savedItems.map(item => `${item.id}-${item.name || item.segmentName || ''}-${item.type}`).join('|')
    });
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
    console.log('Change tracking: Marked as saved');
  };

  const markAsChanged = () => {
    if (isInitialized) {
      console.log('Change tracking: Manually marked as changed');
      setHasUnsavedChanges(true);
    }
  };

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isInitialized
  };
};
