
import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useRundownItemActions } from './useRundownItemActions';
import { useRundownCalculations } from './useRundownCalculations';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { defaultRundownItems } from '@/data/defaultRundownItems';

export type { RundownItem } from '@/types/rundown';

const normalizeRundownItem = (item: RundownItem): RundownItem => ({
  ...item,
  status: item.status || 'upcoming',
  customFields: item.customFields || {},
  segmentName: isHeaderItem(item) ? item.segmentName || item.rowNumber : item.segmentName,
  gfx: item.gfx || '',
  video: item.video || '',
  elapsedTime: item.elapsedTime || '00:00:00',
});

export const useRundownItems = () => {
  const params = useParams<{ id: string }>();
  const rawId = params.id;
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;
  
  const { savedRundowns, loading } = useRundownStorage();
  const [items, setItems] = useState<RundownItem[]>([]);
  const loadedRundownIdRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // Memoize the current rundown to prevent unnecessary effects
  const currentRundown = useMemo(() => {
    if (!rundownId || loading || savedRundowns.length === 0) return null;
    return savedRundowns.find(r => r.id === rundownId);
  }, [rundownId, savedRundowns, loading]);

  // Load rundown data when conditions are met
  useEffect(() => {
    // Prevent loading if already loading or already loaded this rundown
    if (isLoadingRef.current || loadedRundownIdRef.current === (rundownId || 'new')) {
      return;
    }

    // For new rundowns (no ID)
    if (!rundownId) {
      if (loadedRundownIdRef.current !== 'new') {
        console.log('useRundownItems: New rundown, setting default items');
        loadedRundownIdRef.current = 'new';
        setItems(defaultRundownItems);
      }
      return;
    }

    // For existing rundowns - wait for savedRundowns to load
    if (loading || savedRundowns.length === 0) {
      return;
    }

    // Load existing rundown
    if (currentRundown?.items) {
      console.log('useRundownItems: Loading rundown items for:', rundownId);
      isLoadingRef.current = true;
      loadedRundownIdRef.current = rundownId;
      const normalizedItems = currentRundown.items.map(normalizeRundownItem);
      setItems(normalizedItems);
      isLoadingRef.current = false;
    } else if (currentRundown === undefined && savedRundowns.length > 0) {
      console.log('useRundownItems: Rundown not found, using defaults for ID:', rundownId);
      loadedRundownIdRef.current = rundownId;
      setItems(defaultRundownItems);
    }
  }, [rundownId, currentRundown, loading, savedRundowns.length]);

  // Reset when rundownId changes
  useEffect(() => {
    const currentId = rundownId || 'new';
    if (loadedRundownIdRef.current && loadedRundownIdRef.current !== currentId) {
      loadedRundownIdRef.current = null;
      isLoadingRef.current = false;
    }
  }, [rundownId]);

  const actions = useRundownItemActions(setItems);
  const calculations = useRundownCalculations(items);

  return {
    items,
    setItems,
    ...actions,
    ...calculations,
  };
};
