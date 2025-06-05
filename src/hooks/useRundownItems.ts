
import { useState, useCallback } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { useRundownCalculations } from './useRundownCalculations';

export const useRundownItems = (markAsChanged: () => void) => {
  const [items, setItems] = useState<RundownItem[]>([]);
  
  // Use centralized calculations
  const { getRowNumber, calculateTotalRuntime, calculateHeaderDuration } = useRundownCalculations(items);

  const updateItem = useCallback((id: string, field: string, value: string) => {
    setItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
    markAsChanged();
  }, [markAsChanged]);

  const addRow = useCallback((calculateEndTime: (startTime: string, duration: string) => string, insertAfterIndex?: number) => {
    const newItem: RundownItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'regular',
      rowNumber: '',
      name: '',
      duration: '00:01:00',
      startTime: '00:00:00',
      endTime: '00:01:00',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      status: 'upcoming' as const
    };

    setItems(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < safePrev.length) {
        const newItems = [...safePrev];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
        return newItems;
      } else {
        return [...safePrev, newItem];
      }
    });
    markAsChanged();
  }, [markAsChanged]);

  const addHeader = useCallback((insertAfterIndex?: number) => {
    const newItem: RundownItem = {
      id: `header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'header',
      rowNumber: '',
      name: 'New Header',
      duration: '',
      startTime: '',
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      status: 'upcoming' as const,
      segmentName: 'A' // Will be recalculated by time calculations
    };

    setItems(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      let newItems;
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < safePrev.length) {
        newItems = [...safePrev];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
      } else {
        newItems = [...safePrev, newItem];
      }

      // Renumber all headers after insertion
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let currentHeaderIndex = 0;
      
      return newItems.map((item) => {
        if (isHeaderItem(item)) {
          const updatedItem = { ...item, segmentName: letters[currentHeaderIndex] || 'A' };
          currentHeaderIndex++;
          return updatedItem;
        }
        return item;
      });
    });
    markAsChanged();
  }, [markAsChanged]);

  const deleteRow = useCallback((id: string) => {
    setItems(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const filteredItems = safePrev.filter(item => item.id !== id);
      
      // Renumber headers after deletion
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let headerIndex = 0;
      
      return filteredItems.map(item => {
        if (isHeaderItem(item)) {
          const updatedItem = { ...item, segmentName: letters[headerIndex] || 'A' };
          headerIndex++;
          return updatedItem;
        }
        return item;
      });
    });
    markAsChanged();
  }, [markAsChanged]);

  const deleteMultipleRows = useCallback((ids: string[]) => {
    setItems(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const filteredItems = safePrev.filter(item => !ids.includes(item.id));
      
      // Renumber headers after deletion
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let headerIndex = 0;
      
      return filteredItems.map(item => {
        if (isHeaderItem(item)) {
          const updatedItem = { ...item, segmentName: letters[headerIndex] || 'A' };
          headerIndex++;
          return updatedItem;
        }
        return item;
      });
    });
    markAsChanged();
  }, [markAsChanged]);

  const addMultipleRows = useCallback((newItems: RundownItem[], calculateEndTime: (startTime: string, duration: string) => string) => {
    setItems(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const safeNewItems = Array.isArray(newItems) ? newItems : [];
      return [...safePrev, ...safeNewItems];
    });
    markAsChanged();
  }, [markAsChanged]);

  const toggleFloatRow = useCallback((id: string) => {
    setItems(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(item => 
        item.id === id ? { ...item, isFloating: !item.isFloating } : item
      );
    });
    markAsChanged();
  }, [markAsChanged]);

  return {
    items: Array.isArray(items) ? items : [],
    setItems: (newItems: RundownItem[] | ((prev: RundownItem[]) => RundownItem[])) => {
      if (typeof newItems === 'function') {
        setItems(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          const result = newItems(safePrev);
          return Array.isArray(result) ? result : [];
        });
      } else {
        setItems(Array.isArray(newItems) ? newItems : []);
      }
    },
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
  };
};
