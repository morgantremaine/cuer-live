
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';

interface SavedData {
  items: RundownItem[];
  title: string;
  timezone: string;
}

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, timezone: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();
  
  const lastSavedDataRef = useRef<SavedData | null>(null);
  const isInitializedRef = useRef(false);

  // Find current rundown
  const currentRundown = savedRundowns.find(r => r.id === rundownId);
  const isNewRundown = !rundownId;

  const serializeData = useCallback((items: RundownItem[], title: string, timezone: string): string => {
    return JSON.stringify({ items, title, timezone });
  }, []);

  // Initialize the baseline when component mounts
  useEffect(() => {
    if (loading || isInitializedRef.current) return;
    
    console.log('🔄 Initializing change tracking baseline...', {
      isNewRundown,
      hasCurrentRundown: !!currentRundown,
      itemsLength: items.length,
      title: rundownTitle,
      timezone
    });
    
    if (currentRundown && !isNewRundown) {
      lastSavedDataRef.current = {
        items: currentRundown.items || [],
        title: currentRundown.title || 'Untitled Rundown',
        timezone: currentRundown.timezone || 'America/New_York'
      };
      console.log('📁 Initialized with existing rundown:', currentRundown.id);
      setHasUnsavedChanges(false);
    } else {
      // For new rundowns, set an empty baseline so any changes will be detected
      lastSavedDataRef.current = {
        items: [],
        title: 'Live Broadcast Rundown',
        timezone: 'America/New_York'
      };
      console.log('✨ Initialized for new rundown with empty baseline');
      // For new rundowns, mark as changed if we have any non-default content
      const hasNonDefaultContent = items.length > 0 || rundownTitle !== 'Live Broadcast Rundown' || timezone !== 'America/New_York';
      console.log('🔍 New rundown content check:', {
        itemsLength: items.length,
        title: rundownTitle,
        timezone,
        hasNonDefaultContent
      });
      setHasUnsavedChanges(hasNonDefaultContent);
    }
    
    isInitializedRef.current = true;
  }, [currentRundown, isNewRundown, loading, items.length, rundownTitle, timezone]);

  // Check for changes using memoized serialization
  useEffect(() => {
    if (!isInitializedRef.current || !lastSavedDataRef.current) {
      console.log('⏸️ Skipping change detection - not initialized or no baseline');
      return;
    }

    const currentSerialized = serializeData(items, rundownTitle, timezone);
    const lastSavedSerialized = serializeData(lastSavedDataRef.current.items, lastSavedDataRef.current.title, lastSavedDataRef.current.timezone);
    
    const hasChanges = currentSerialized !== lastSavedSerialized;
    
    console.log('🔍 Change detection:', {
      hasChanges,
      currentHasUnsavedChanges: hasUnsavedChanges,
      willUpdate: hasChanges !== hasUnsavedChanges,
      currentItems: items.length,
      savedItems: lastSavedDataRef.current?.items.length || 0,
      currentTitle: rundownTitle,
      savedTitle: lastSavedDataRef.current?.title || 'none',
      currentTimezone: timezone,
      savedTimezone: lastSavedDataRef.current?.timezone || 'none'
    });
    
    if (hasChanges !== hasUnsavedChanges) {
      console.log('📝 Updating unsaved changes state to:', hasChanges);
      setHasUnsavedChanges(hasChanges);
    }
  }, [items, rundownTitle, timezone, hasUnsavedChanges, serializeData]);

  const markAsSaved = useCallback((items: RundownItem[], title: string, timezone: string) => {
    console.log('✅ Marking as saved with items:', items.length, 'title:', title, 'timezone:', timezone);
    lastSavedDataRef.current = { items: [...items], title, timezone };
    setHasUnsavedChanges(false);
  }, []);

  const markAsChanged = useCallback(() => {
    console.log('🔄 Manually marking as changed');
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
