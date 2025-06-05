
import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { defaultRundownItems } from '@/data/defaultRundownItems';
import { useRundownCalculations } from './useRundownCalculations';

export const useRundownItems = (markAsChanged?: () => void) => {
  const [items, setItems] = useState<RundownItem[]>(defaultRundownItems);

  // Use the proper calculation system for row numbering
  const { getRowNumber, calculateTotalRuntime, calculateHeaderDuration } = useRundownCalculations(items);

  const updateItem = useCallback((id: string, field: string, value: string) => {
    console.log(`useRundownItems: updateItem called - id: ${id}, field: ${field}, value:`, value);
    
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.id === id) {
          // Handle nested custom field updates
          if (field.startsWith('customFields.')) {
            const customFieldKey = field.replace('customFields.', '');
            console.log(`useRundownItems: Updating custom field ${customFieldKey} to:`, value);
            
            const updatedItem = {
              ...item,
              customFields: {
                ...item.customFields,
                [customFieldKey]: value
              }
            };
            console.log(`useRundownItems: Updated item:`, updatedItem);
            return updatedItem;
          }
          
          // Handle regular field updates
          const updatedItem = { ...item, [field]: value };
          console.log(`useRundownItems: Updated regular field ${field}:`, updatedItem);
          return updatedItem;
        }
        return item;
      });
      
      console.log(`useRundownItems: New items array:`, newItems);
      return newItems;
    });
    
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const addRow = useCallback((calculateEndTime: (item: RundownItem, prevEndTime?: string) => string, insertAfterIndex?: number) => {
    const newItem: RundownItem = {
      id: uuidv4(),
      type: 'regular',
      rowNumber: '',
      name: '',
      segmentName: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      duration: '00:00',
      startTime: '',
      endTime: '',
      elapsedTime: '',
      notes: '',
      color: '#ffffff',
      isFloating: false,
      customFields: {}
    };

    setItems(prevItems => {
      const targetIndex = insertAfterIndex !== undefined ? insertAfterIndex + 1 : prevItems.length;
      const newItems = [...prevItems];
      
      // Calculate times
      const prevItem = targetIndex > 0 ? newItems[targetIndex - 1] : null;
      const prevEndTime = prevItem?.endTime || '00:00:00';
      newItem.startTime = prevEndTime;
      newItem.endTime = calculateEndTime(newItem, prevEndTime);
      
      newItems.splice(targetIndex, 0, newItem);
      
      // Recalculate subsequent times
      for (let i = targetIndex + 1; i < newItems.length; i++) {
        if (!isHeaderItem(newItems[i])) {
          const prevEndTime = newItems[i - 1]?.endTime || '00:00:00';
          newItems[i].startTime = prevEndTime;
          newItems[i].endTime = calculateEndTime(newItems[i], prevEndTime);
        }
      }
      
      return newItems;
    });
    
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const addHeader = useCallback((insertAfterIndex?: number) => {
    setItems(prevItems => {
      const targetIndex = insertAfterIndex !== undefined ? insertAfterIndex + 1 : prevItems.length;
      
      // Calculate the correct segment name based on existing headers
      let headerCount = 0;
      for (let i = 0; i < targetIndex; i++) {
        if (isHeaderItem(prevItems[i])) {
          headerCount++;
        }
      }
      
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const segmentName = letters[headerCount] || 'A';
      
      const newHeader: RundownItem = {
        id: uuidv4(),
        type: 'header',
        rowNumber: '',
        name: 'New Header',
        segmentName: segmentName,
        talent: '',
        script: '',
        gfx: '',
        video: '',
        duration: '00:00:00',
        startTime: '',
        endTime: '',
        elapsedTime: '',
        notes: '',
        color: '#3B82F6',
        isFloating: false,
        customFields: {}
      };

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
        id: uuidv4(),
        customFields: item.customFields || {}
      }));
      
      const newItemsArray = [...prevItems];
      newItemsArray.splice(targetIndex, 0, ...itemsWithIds);
      
      // Recalculate times if calculateEndTime is provided
      if (calculateEndTime) {
        for (let i = targetIndex; i < newItemsArray.length; i++) {
          if (!isHeaderItem(newItemsArray[i])) {
            const prevEndTime = i > 0 ? newItemsArray[i - 1]?.endTime || '00:00:00' : '00:00:00';
            newItemsArray[i].startTime = prevEndTime;
            newItemsArray[i].endTime = calculateEndTime(newItemsArray[i], prevEndTime);
          }
        }
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
