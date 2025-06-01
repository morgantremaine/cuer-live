
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useRundownItemActions } from './useRundownItemActions';
import { useRundownCalculations } from './useRundownCalculations';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { defaultRundownItems } from '@/data/defaultRundownItems';

export type { RundownItem } from '@/types/rundown';

// Simplified global tracker
let globalItemsInitialized = new Set<string>();

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
  const initRef = useRef(false);

  // Load rundown data when conditions are met
  useEffect(() => {
    const currentKey = rundownId || 'new';
    
    // Prevent multiple initializations
    if (initRef.current || globalItemsInitialized.has(currentKey)) {
      return;
    }

    // For new rundowns (no ID)
    if (!rundownId) {
      console.log('useRundownItems: New rundown, setting default items');
      initRef.current = true;
      globalItemsInitialized.add(currentKey);
      setItems(defaultRundownItems);
      return;
    }

    // For existing rundowns - wait for savedRundowns to load
    if (loading || savedRundowns.length === 0) {
      return;
    }

    // Load existing rundown
    const existingRundown = savedRundowns.find(r => r.id === rundownId);
    if (existingRundown?.items) {
      console.log('useRundownItems: Loading rundown items for:', rundownId);
      initRef.current = true;
      globalItemsInitialized.add(currentKey);
      const normalizedItems = existingRundown.items.map(normalizeRundownItem);
      setItems(normalizedItems);
    } else if (!existingRundown) {
      console.log('useRundownItems: Rundown not found, using defaults for ID:', rundownId);
      initRef.current = true;
      globalItemsInitialized.add(currentKey);
      setItems(defaultRundownItems);
    }
  }, [rundownId, savedRundowns, loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const currentKey = rundownId || 'new';
      globalItemsInitialized.delete(currentKey);
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
