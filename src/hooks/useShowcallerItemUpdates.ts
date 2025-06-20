
import { useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

interface UseShowcallerItemUpdatesProps {
  items: RundownItem[];
  setItems: (items: RundownItem[]) => void;
  setShowcallerUpdate?: (isUpdate: boolean) => void;
}

export const useShowcallerItemUpdates = ({
  items,
  setItems,
  setShowcallerUpdate
}: UseShowcallerItemUpdatesProps) => {
  const operationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Silent update that doesn't trigger main autosave
  const updateItemSilent = useCallback((id: string, field: string, value: string) => {
    // Signal showcaller operation start
    if (setShowcallerUpdate) {
      setShowcallerUpdate(true);
    }

    // Clear any existing timeout
    if (operationTimeoutRef.current) {
      clearTimeout(operationTimeoutRef.current);
    }

    // Update the item immediately
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));

    // Extended timeout to ensure showcaller operations complete
    operationTimeoutRef.current = setTimeout(() => {
      if (setShowcallerUpdate) {
        setShowcallerUpdate(false);
      }
    }, 5000); // 5 seconds to allow for any follow-up operations

    console.log('📺 Silent update:', id, field, value);
  }, [items, setItems, setShowcallerUpdate]);

  // Batch update multiple items silently
  const updateMultipleItemsSilent = useCallback((updates: { id: string; field: string; value: string }[]) => {
    if (setShowcallerUpdate) {
      setShowcallerUpdate(true);
    }

    if (operationTimeoutRef.current) {
      clearTimeout(operationTimeoutRef.current);
    }

    setItems(items.map(item => {
      const update = updates.find(u => u.id === item.id);
      return update ? { ...item, [update.field]: update.value } : item;
    }));

    operationTimeoutRef.current = setTimeout(() => {
      if (setShowcallerUpdate) {
        setShowcallerUpdate(false);
      }
    }, 5000);

    console.log('📺 Batch silent update:', updates.length, 'items');
  }, [items, setItems, setShowcallerUpdate]);

  // Clear all current statuses silently
  const clearCurrentStatusSilent = useCallback(() => {
    if (setShowcallerUpdate) {
      setShowcallerUpdate(true);
    }

    if (operationTimeoutRef.current) {
      clearTimeout(operationTimeoutRef.current);
    }

    const updates = items
      .filter(item => item.status === 'current')
      .map(item => ({ id: item.id, field: 'status', value: 'completed' }));

    if (updates.length > 0) {
      updateMultipleItemsSilent(updates);
      console.log('📺 Cleared current status from', updates.length, 'items');
    }
  }, [items, updateMultipleItemsSilent, setShowcallerUpdate]);

  return {
    updateItemSilent,
    updateMultipleItemsSilent,
    clearCurrentStatusSilent
  };
};
