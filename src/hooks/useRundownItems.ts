
import { useState, useCallback, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { defaultRundownItems } from '@/data/defaultRundownItems';
import { useRundownCalculations } from './useRundownCalculations';
import { updateRundownItem } from './useRundownItems/itemUpdater';
import { createNewRow, createNewHeader, calculateTimeUpdates } from './useRundownItems/rowCreator';
import { calculateHeaderSegmentName } from './useRundownItems/headerUtils';

export const useRundownItems = (markAsChanged?: () => void) => {
  const [items, setItems] = useState<RundownItem[]>(defaultRundownItems);

  // Use the proper calculation system for row numbering
  const { getRowNumber, calculateTotalRuntime, calculateHeaderDuration } = useRundownCalculations(items);

  const updateItem = useCallback((id: string, field: string, value: string) => {    
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.id === id) {
          return updateRundownItem(item, field, value);
        }
        return item;
      });
      
      return newItems;
    });
    
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const addRow = useCallback((calculateEndTime: (item: RundownItem, prevEndTime?: string) => string, insertAfterIndex?: number) => {
    const newItem = createNewRow();

    setItems(prevItems => {
      const targetIndex = insertAfterIndex !== undefined ? insertAfterIndex + 1 : prevItems.length;
      const newItems = [...prevItems];
      
      // Calculate times
      const prevItem = targetIndex > 0 ? newItems[targetIndex - 1] : null;
      const prevEndTime = prevItem?.endTime || '00:00:00';
      newItem.startTime = prevEndTime;
      newItem.endTime = calculateEndTime(newItem, prevEndTime);
      
      newItems.splice(targetIndex, 0, newItem);
      
      return calculateTimeUpdates(newItems, targetIndex + 1, calculateEndTime);
    });
    
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const addHeader = useCallback((insertAfterIndex?: number) => {
    setItems(prevItems => {
      const targetIndex = insertAfterIndex !== undefined ? insertAfterIndex + 1 : prevItems.length;
      const segmentName = calculateHeaderSegmentName(prevItems, targetIndex);
      const newHeader = createNewHeader(segmentName);

      const newItems = [...prevItems];
      newItems.splice(targetIndex, 0, newHeader);
      return newItems;
    });
    
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const deleteRow = useCallback((id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const deleteMultipleRows = useCallback((ids: string[]) => {
    setItems(prevItems => prevItems.filter(item => !ids.includes(item.id)));
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const addMultipleRows = useCallback((newItems: RundownItem[], insertAfterIndex?: number, calculateEndTime?: (item: RundownItem, prevEndTime?: string) => string) => {
    setItems(prevItems => {
      const targetIndex = insertAfterIndex !== undefined ? insertAfterIndex + 1 : prevItems.length;
      const itemsWithIds = newItems.map(item => ({
        ...item,
        id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
        customFields: item.customFields || {}
      }));
      
      const newItemsArray = [...prevItems];
      newItemsArray.splice(targetIndex, 0, ...itemsWithIds);
      
      // Recalculate times if calculateEndTime is provided
      if (calculateEndTime) {
        return calculateTimeUpdates(newItemsArray, targetIndex, calculateEndTime);
      }
      
      return newItemsArray;
    });
    
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const toggleFloatRow = useCallback((id: string) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === id 
          ? { ...item, isFloating: !item.isFloating }
          : item
      )
    );
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  return useMemo(() => ({
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration
  }), [
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration
  ]);
};
