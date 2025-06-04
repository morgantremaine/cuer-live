
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
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prev.length) {
        const newItems = [...prev];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
        return newItems;
      } else {
        return [...prev, newItem];
      }
    });
    markAsChanged();
  }, [markAsChanged]);

  const addHeader = useCallback((insertAfterIndex?: number) => {
    setItems(prev => {
      // Calculate the correct segment letter based on position
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let targetIndex = insertAfterIndex !== undefined ? insertAfterIndex + 1 : prev.length;
      
      // Count headers that will be before this new header
      let headerCount = 0;
      for (let i = 0; i < targetIndex; i++) {
        if (i < prev.length && isHeaderItem(prev[i])) {
          headerCount++;
        }
      }

      const segmentName = letters[headerCount] || 'A';

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
        segmentName: segmentName
      };

      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prev.length) {
        const newItems = [...prev];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
        
        // Renumber all subsequent headers
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
      } else {
        return [...prev, newItem];
      }
    });
    markAsChanged();
  }, [markAsChanged]);

  const deleteRow = useCallback((id: string) => {
    setItems(prev => {
      const filteredItems = prev.filter(item => item.id !== id);
      
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
      const filteredItems = prev.filter(item => !ids.includes(item.id));
      
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
    setItems(prev => [...prev, ...newItems]);
    markAsChanged();
  }, [markAsChanged]);

  const toggleFloatRow = useCallback((id: string) => {
    setItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, isFloating: !item.isFloating } : item
      )
    );
    markAsChanged();
  }, [markAsChanged]);

  return {
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
  };
};
