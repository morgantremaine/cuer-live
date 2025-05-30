
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useRundownItemActions } from './useRundownItemActions';
import { useRundownCalculations } from './useRundownCalculations';
import { RundownItem } from '@/types/rundown';
import { defaultRundownItems } from '@/data/defaultRundownItems';

export type { RundownItem } from '@/types/rundown';

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
      
      if (existingRundown && existingRundown.items) {
        console.log('Found existing rundown, loading items:', existingRundown.items.length);
        // Ensure loaded items have all required properties with proper defaults
        const itemsWithDefaults = existingRundown.items.map(item => ({
          ...item,
          isHeader: item.type === 'header',
          isFloated: item.isFloated || false,
          segmentName: item.segmentName || (item.type === 'header' ? item.rowNumber : undefined),
          status: item.status || 'upcoming',
          customFields: item.customFields || {},
        }));
        setItems(itemsWithDefaults);
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
