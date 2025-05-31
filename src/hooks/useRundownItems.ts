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
  const rawId = params.id;
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;
  
  const { savedRundowns, loading } = useRundownStorage();
  const [items, setItems] = useState<RundownItem[]>([]);
  const loadedRef = useRef<string | null>(null);
  const initRef = useRef(false);

  // Initialize with defaults for new rundowns only once
  useEffect(() => {
    if (initRef.current) return;
    
    if (!rundownId && loadedRef.current !== null) {
      console.log('useRundownItems: New rundown, setting default items');
      loadedRef.current = null;
      setItems(defaultRundownItems);
      initRef.current = true;
    }
  }, [rundownId]);

  // Load existing rundown data when rundownId changes - but only once
  useEffect(() => {
    if (loading || initRef.current) return;
    
    if (loadedRef.current === rundownId) return;
    
    if (rundownId && savedRundowns.length > 0) {
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      
      if (existingRundown?.items && loadedRef.current !== rundownId) {
        console.log('useRundownItems: Loading rundown items for:', rundownId);
        loadedRef.current = rundownId;
        const normalizedItems = existingRundown.items.map(normalizeRundownItem);
        setItems(normalizedItems);
        initRef.current = true;
      } else if (!existingRundown && loadedRef.current !== rundownId) {
        console.log('useRundownItems: Rundown not found, using defaults for ID:', rundownId);
        loadedRef.current = rundownId;
        setItems(defaultRundownItems);
        initRef.current = true;
      }
    } else if (!rundownId && items.length === 0) {
      console.log('useRundownItems: New rundown, using defaults');
      loadedRef.current = null;
      setItems(defaultRundownItems);
      initRef.current = true;
    }
  }, [rundownId, savedRundowns, loading, items.length]);

  // Reset initialization when rundown changes
  useEffect(() => {
    return () => {
      initRef.current = false;
    };
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
