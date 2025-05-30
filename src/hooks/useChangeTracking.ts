
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();
  
  const lastSavedDataRef = useRef<{ items: RundownItem[], title: string } | null>(null);
  const isInitializedRef = useRef(false);

  // Find current rundown
  const currentRundown = savedRundowns.find(r => r.id === rundownId);
  const isNewRundown = !rundownId;

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

  // Check for changes and mark as unsaved
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const currentData = { items, title: rundownTitle };
    
    // Compare with last saved data
    const hasChanges = lastSavedDataRef.current === null || 
      JSON.stringify(lastSavedDataRef.current) !== JSON.stringify(currentData);
    
    console.log('Checking for changes:', {
      hasChanges,
      lastSaved: lastSavedDataRef.current,
      current: currentData
    });
    
    if (hasChanges && !hasUnsavedChanges) {
      console.log('Changes detected - marking as unsaved');
      setHasUnsavedChanges(true);
    }
  }, [items, rundownTitle, hasUnsavedChanges]);

  const markAsSaved = (items: RundownItem[], title: string) => {
    lastSavedDataRef.current = { items, title };
    setHasUnsavedChanges(false);
  };

  const markAsChanged = () => {
    console.log('Manually marking as changed');
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  };

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isInitialized: isInitializedRef.current
  };
};
