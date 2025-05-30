
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';

interface SavedData {
  items: RundownItem[];
  title: string;
}

export const useChangeTracking = (items: RundownItem[], rundownTitle: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();
  
  const lastSavedDataRef = useRef<SavedData | null>(null);
  const isInitializedRef = useRef(false);

  // Find current rundown
  const currentRundown = savedRundowns.find(r => r.id === rundownId);
  const isNewRundown = !rundownId;

  const serializeData = useCallback((items: RundownItem[], title: string): string => {
    return JSON.stringify({ items, title });
  }, []);

  // Initialize the baseline when component mounts
  useEffect(() => {
    if (loading || isInitializedRef.current) return;
    
    console.log('Initializing change tracking baseline...');
    
    if (currentRundown && !isNewRundown) {
      lastSavedDataRef.current = {
        items: currentRundown.items || [],
        title: currentRundown.title || 'Untitled Rundown'
      };
      console.log('Initialized with existing rundown:', currentRundown.id);
    } else {
      lastSavedDataRef.current = null;
      console.log('Initialized for new rundown');
    }
    
    isInitializedRef.current = true;
    setHasUnsavedChanges(false);
  }, [currentRundown, isNewRundown, loading]);

  // Check for changes using memoized serialization
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const currentSerialized = serializeData(items, rundownTitle);
    const lastSavedSerialized = lastSavedDataRef.current 
      ? serializeData(lastSavedDataRef.current.items, lastSavedDataRef.current.title)
      : null;
    
    const hasChanges = lastSavedSerialized === null || currentSerialized !== lastSavedSerialized;
    
    if (hasChanges && !hasUnsavedChanges) {
      console.log('Changes detected - marking as unsaved');
      setHasUnsavedChanges(true);
    }
  }, [items, rundownTitle, hasUnsavedChanges, serializeData]);

  const markAsSaved = useCallback((items: RundownItem[], title: string) => {
    lastSavedDataRef.current = { items, title };
    setHasUnsavedChanges(false);
  }, []);

  const markAsChanged = useCallback(() => {
    console.log('Manually marking as changed');
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  }, [hasUnsavedChanges]);

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isInitialized: isInitializedRef.current
  };
};
