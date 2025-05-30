
import { useState, useEffect } from 'react';
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
  
  const [items, setItems] = useState<RundownItem[]>(defaultRundownItems);

  // Load existing rundown data when rundownId changes
  useEffect(() => {
    if (loading) return;
    
    if (rundownId && savedRundowns.length > 0) {
      console.log('Loading rundown with ID:', rundownId);
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      
      if (existingRundown?.items) {
        console.log('Found existing rundown, loading items:', existingRundown.items.length);
        const normalizedItems = existingRundown.items.map(normalizeRundownItem);
        setItems(normalizedItems);
      } else {
        console.log('Rundown not found or has no items, keeping default');
      }
    } else if (!rundownId) {
      console.log('No rundown ID, using default items for new rundown');
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
