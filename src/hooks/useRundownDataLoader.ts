
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { SavedRundown } from './useRundownStorage/types';
import { Column } from '@/hooks/useUserColumnPreferences';
import { RundownItem } from '@/types/rundown';
import { migrateTimezone } from '@/utils/timezoneMigration';

interface UseRundownDataLoaderProps {
  rundownId?: string;
  savedRundowns: SavedRundown[];
  loading: boolean;
  setRundownTitle: (title: string) => void;
  setTimezoneDirectly: (timezone: string) => void; // Use direct setter
  setRundownStartTimeDirectly: (startTime: string) => void; // Use direct setter
  handleLoadLayout: (columns: Column[]) => void;
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void;
  onRundownLoaded?: (rundown: SavedRundown) => void;
}

export const useRundownDataLoader = ({
  rundownId,
  savedRundowns,
  loading,
  setRundownTitle,
  setTimezoneDirectly,
  setRundownStartTimeDirectly,
  handleLoadLayout,
  setItems,
  onRundownLoaded
}: UseRundownDataLoaderProps) => {
  const params = useParams<{ id: string }>();
  const paramId = params.id;
  const loadedRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // Only proceed if we have rundowns loaded and a specific rundown ID
    if (loading || savedRundowns.length === 0 || isLoadingRef.current) return;
    
    const currentRundownId = rundownId || paramId;
    if (!currentRundownId) return;

    // Prevent loading the same rundown multiple times
    if (loadedRef.current === currentRundownId) return;

    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    if (!rundown) return;

    console.log('🔄 Loading rundown data:', rundown.title, 'ID:', rundown.id, 'with timezone:', rundown.timezone, 'start_time:', rundown.start_time, 'columns:', rundown.columns);
    
    // Mark as loading and loaded to prevent loops
    isLoadingRef.current = true;
    loadedRef.current = currentRundownId;
    
    // Set the rundown data using direct setters to avoid triggering auto-save
    setRundownTitle(rundown.title);
    
    // Load timezone - use saved value or fallback to default, with migration
    const rawTimezone = rundown.timezone || 'America/New_York';
    const timezoneToLoad = migrateTimezone(rawTimezone);
    console.log('🌍 Loading timezone directly:', timezoneToLoad);
    setTimezoneDirectly(timezoneToLoad);
    
    // Load start time - use saved value or fallback to default
    const startTimeToLoad = rundown.start_time || '09:00:00';
    console.log('⏰ Loading start time directly:', startTimeToLoad);
    setRundownStartTimeDirectly(startTimeToLoad);
    
    // Columns are now handled exclusively by useUserColumnPreferences
    // This prevents conflicts between rundown-stored columns and user preferences
    console.log('📊 Skipping column loading - handled by useUserColumnPreferences');

    // Load the items back into the state using the updater pattern
    if (rundown.items && Array.isArray(rundown.items)) {
      console.log('📋 Setting rundown items:', rundown.items.length);
      setItems(() => rundown.items);
    }

    // Call the callback with the loaded rundown
    if (onRundownLoaded) {
      onRundownLoaded(rundown);
    }

    // Reset loading flag after a short delay
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 100);
  }, [
    rundownId, 
    paramId, 
    savedRundowns,
    loading, 
    setRundownTitle, 
    setTimezoneDirectly, 
    setRundownStartTimeDirectly, 
    handleLoadLayout,
    setItems,
    onRundownLoaded
  ]);

  // Reset loaded reference when rundown ID changes
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    if (loadedRef.current && loadedRef.current !== currentRundownId) {
      loadedRef.current = null;
      isLoadingRef.current = false;
    }
  }, [rundownId, paramId]);
};
