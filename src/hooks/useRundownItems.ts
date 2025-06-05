
import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { defaultRundownItems } from '@/data/defaultRundownItems';

export const useRundownItems = (markAsChanged?: () => void) => {
  const [items, setItems] = useState<RundownItem[]>(defaultRundownItems);

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
    const newHeader: RundownItem = {
      id: uuidv4(),
      type: 'header',
      rowNumber: '',
      name: 'New Header',
      segmentName: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
      talent: '',
      script: '',
      gfx: '',
      video: '',
      duration: '00:00:00',
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
        customFields: item.customFields || {} // Ensure custom fields exist
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

  const getRowNumber = useCallback((index: number) => {
    let rowNumber = 1;
    for (let i = 0; i < index; i++) {
      if (!isHeaderItem(items[i])) {
        rowNumber++;
      }
    }
    return isHeaderItem(items[index]) ? items[index].segmentName || 'H' : rowNumber.toString();
  }, [items]);

  const calculateTotalRuntime = useCallback(() => {
    const totalMinutes = items.reduce((total, item) => {
      if (!isHeaderItem(item) && !item.isFloating && item.duration) {
        const [minutes, seconds] = item.duration.split(':').map(Number);
        return total + minutes + (seconds / 60);
      }
      return total;
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.floor((totalMinutes % 1) * 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [items]);

  const calculateHeaderDuration = useCallback((headerIndex: number) => {
    if (!isHeaderItem(items[headerIndex])) return '00:00';
    
    let totalMinutes = 0;
    let i = headerIndex + 1;
    
    while (i < items.length && !isHeaderItem(items[i])) {
      const item = items[i];
      if (!item.isFloating && item.duration) {
        const [minutes, seconds] = item.duration.split(':').map(Number);
        totalMinutes += minutes + (seconds / 60);
      }
      i++;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.floor((totalMinutes % 1) * 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [items]);

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
