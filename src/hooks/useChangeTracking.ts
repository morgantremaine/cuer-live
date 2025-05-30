
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
      setHasUnsavedChanges(false);
    } else {
      // For new rundowns, set an empty baseline so any changes will be detected
      lastSavedDataRef.current = {
        items: [],
        title: 'Live Broadcast Rundown'
      };
      console.log('Initialized for new rundown with empty baseline');
      // For new rundowns, mark as changed if we have any non-default content
      const hasNonDefaultContent = items.length > 0 || rundownTitle !== 'Live Broadcast Rundown';
      setHasUnsavedChanges(hasNonDefaultContent);
    }
    
    isInitializedRef.current = true;
  }, [currentRundown, isNewRundown, loading, items.length, rundownTitle]);

  // Check for changes using memoized serialization
  useEffect(() => {
    if (!isInitializedRef.current || !lastSavedDataRef.current) return;

    const currentSerialized = serializeData(items, rundownTitle);
    const lastSavedSerialized = serializeData(lastSavedDataRef.current.items, lastSavedDataRef.current.title);
    
    const hasChanges = currentSerialized !== lastSavedSerialized;
    
    if (hasChanges !== hasUnsavedChanges) {
      console.log('Change detection:', hasChanges ? 'Changes detected' : 'No changes');
      setHasUnsavedChanges(hasChanges);
    }
  }, [items, rundownTitle, hasUnsavedChanges, serializeData]);

  const markAsSaved = useCallback((items: RundownItem[], title: string) => {
    console.log('Marking as saved with items:', items.length, 'title:', title);
    lastSavedDataRef.current = { items: [...items], title };
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
