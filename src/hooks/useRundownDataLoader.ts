import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { SavedRundown } from './useRundownStorage/types';
import { Column } from './useColumnsManager';
import { RundownItem } from '@/types/rundown';

interface UseRundownDataLoaderProps {
  rundownId?: string;
  savedRundowns: SavedRundown[];
  loading: boolean;
  setRundownTitle: (title: string) => void;
  setTimezone: (timezone: string) => void;
  setRundownStartTime: (startTime: string) => void;
  handleLoadLayout: (columns: Column[]) => void;
  setItems: (items: RundownItem[]) => void;
  onRundownLoaded?: (rundown: SavedRundown) => void;
}

export const useRundownDataLoader = ({
  rundownId,
  savedRundowns,
  loading,
  setRundownTitle,
  setTimezone,
  setRundownStartTime,
  handleLoadLayout,
  setItems,
  onRundownLoaded
}: UseRundownDataLoaderProps) => {
  const params = useParams<{ id: string }>();
  const paramId = params.id;
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    // This hook is now simplified - most loading logic moved to useRundownDataManagement
    // We keep this for backward compatibility but it's essentially a no-op now
    const currentRundownId = rundownId || paramId;
    if (currentRundownId && loadedRef.current !== currentRundownId) {
      loadedRef.current = currentRundownId;
      console.log('Data loader noting rundown ID:', currentRundownId);
    }
  }, [rundownId, paramId]);

  // Reset when rundown ID changes
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    if (loadedRef.current && loadedRef.current !== currentRundownId) {
      console.log('Rundown ID changed, resetting loader');
      loadedRef.current = null;
    }
  }, [rundownId, paramId]);
};
