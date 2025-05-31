
import { useState, useEffect, useRef } from 'react';
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
});

export const useRundownItems = () => {
  const params = useParams<{ id: string }>();
  const rundownId = params.id;
  const { savedRundowns, loading } = useRundownStorage();
  const [items, setItems] = useState<RundownItem[]>([]);
  const loadedRef = useRef<string | null>(null);

  // Initialize with defaults for new rundowns immediately
  useEffect(() => {
    if (!rundownId && loadedRef.current !== null) {
      console.log('useRundownItems: New rundown, setting default items immediately');
      loadedRef.current = null;
      setItems(defaultRundownItems);
    }
  }, [rundownId]);

  // Load existing rundown data when rundownId changes - but only once
  useEffect(() => {
    if (loading) return;
    
    // Prevent duplicate loading
    if (loadedRef.current === rundownId) return;
    
    if (rundownId && savedRundowns.length > 0) {
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      
      if (existingRundown?.items && loadedRef.current !== rundownId) {
        console.log('useRundownItems: Loading rundown items once:', rundownId, existingRundown.items.length);
        loadedRef.current = rundownId;
        const normalizedItems = existingRundown.items.map(normalizeRundownItem);
        setItems(normalizedItems);
      } else if (!existingRundown && loadedRef.current !== rundownId) {
        console.log('useRundownItems: Rundown not found, using defaults for ID:', rundownId);
        loadedRef.current = rundownId;
        setItems(defaultRundownItems);
      }
    } else if (!rundownId && items.length === 0) {
      // Only set defaults if we don't already have them
      console.log('useRundownItems: New rundown, using defaults');
      loadedRef.current = null;
      setItems(defaultRundownItems);
    }
  }, [rundownId, savedRundowns, loading, items.length]);

  const actions = useRundownItemActions(setItems);
  const calculations = useRundownCalculations(items);

  return {
    items,
    setItems,
    ...actions,
    ...calculations,
  };
};
