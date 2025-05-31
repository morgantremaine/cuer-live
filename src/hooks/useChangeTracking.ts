
import { useState, useEffect, useRef } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[]) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const initialLoadRef = useRef(false);

  // Initialize tracking after first load
  useEffect(() => {
    if (!initialLoadRef.current && items.length >= 0) {
      const signature = JSON.stringify({ items, title: rundownTitle, columns });
      lastSavedDataRef.current = signature;
      initialLoadRef.current = true;
      setIsInitialized(true);
      setHasUnsavedChanges(false);
    }
  }, [items, rundownTitle, columns]);

  // Track changes after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const currentSignature = JSON.stringify({ items, title: rundownTitle, columns });
    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    if (hasChanges !== hasUnsavedChanges) {
      setHasUnsavedChanges(hasChanges);
    }
  }, [items, rundownTitle, columns, isInitialized, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[]) => {
    const signature = JSON.stringify({ items: savedItems, title: savedTitle, columns: savedColumns });
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
  };

  const markAsChanged = () => {
    setHasUnsavedChanges(true);
  };

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isInitialized
  };
};
