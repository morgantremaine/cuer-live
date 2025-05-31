
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
  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();
  const [items, setItems] = useState<RundownItem[]>([]);
  const loadedRef = useRef<string | null>(null);

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
        console.log('useRundownItems: Rundown not found, using defaults');
        loadedRef.current = rundownId;
        setItems(defaultRundownItems);
      }
    } else if (!rundownId && loadedRef.current !== null) {
      console.log('useRundownItems: New rundown, using defaults');
      loadedRef.current = null;
      setItems(defaultRundownItems);
    }
  }, [rundownId, savedRundowns, loading]);

  const actions = useRundownItemActions(setItems);
  const calculations = useRundownCalculations(items);

  return {
    items,
    setItems,
    ...actions,
    ...calculations,
  };
};
