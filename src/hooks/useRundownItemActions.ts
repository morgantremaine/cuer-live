
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

export const useRundownItemActions = (
  setItems: React.Dispatch<React.SetStateAction<RundownItem[]>>
) => {
  const renumberItems = useCallback((items: RundownItem[]) => {
    let headerIndex = 0;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    return items.map(item => {
      if (item.type === 'header') {
        const newHeaderLetter = letters[headerIndex] || 'A';
        headerIndex++;
        return {
          ...item,
          rowNumber: newHeaderLetter,
          segmentName: newHeaderLetter
        };
      } else {
        // For regular items, we'll let the getRowNumber function handle the numbering
        // since it calculates based on position relative to headers
        return item;
      }
    });
  }, []);

  const updateItem = useCallback((id: string, field: string, value: string) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id !== id) return item;
        
        // Handle custom fields with dot notation
        if (field.startsWith('customFields.')) {
          const customFieldKey = field.replace('customFields.', '');
          return {
            ...item,
            customFields: {
              ...item.customFields,
              [customFieldKey]: value
            }
          };
        }
        
        // Handle regular fields
        return { ...item, [field]: value };
      })
    );
  }, [setItems]);

  const addRow = useCallback((calculateEndTime: (startTime: string, duration: string) => string, insertAfterIndex?: number) => {
    setItems(prevItems => {
      const newRowNumber = String(prevItems.filter(item => item.type === 'regular').length + 1);
      
      let newStartTime: string;
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prevItems.length) {
        // Insert after the selected row
        const itemAtIndex = prevItems[insertAfterIndex];
        newStartTime = calculateEndTime(itemAtIndex.startTime, itemAtIndex.duration);
      } else {
        // Insert at the end (default behavior)
        const lastItem = prevItems[prevItems.length - 1];
        newStartTime = lastItem ? calculateEndTime(lastItem.startTime, lastItem.duration) : '00:00:00';
      }

      const newItem: RundownItem = {
        id: String(Date.now()),
        type: 'regular',
        rowNumber: newRowNumber,
        name: 'New Segment',
        startTime: newStartTime,
        duration: '00:00:00',
        endTime: calculateEndTime(newStartTime, '00:00:00'),
        talent: '',
        script: '',
        element: '',
        notes: '',
        color: '#FFFFFF',
        isFloating: false,
        isFloated: false,
        status: 'upcoming',
        customFields: {},
      };

      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prevItems.length) {
        // Insert after the specified index
        const newItems = [...prevItems];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
        return newItems;
      } else {
        // Add to the end (default behavior)
        return [...prevItems, newItem];
      }
    });
  }, [setItems]);

  const addHeader = useCallback((insertAfterIndex?: number) => {
    setItems(prevItems => {
      const newHeaderNumber = String.fromCharCode(65 + prevItems.filter(item => item.type === 'header').length);
      
      let newStartTime: string;
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prevItems.length) {
        // Insert after the selected row
        const itemAtIndex = prevItems[insertAfterIndex];
        newStartTime = itemAtIndex.endTime;
      } else {
        // Insert at the end (default behavior)
        const lastItem = prevItems[prevItems.length - 1];
        newStartTime = lastItem ? lastItem.endTime : '00:00:00';
      }

      const newHeader: RundownItem = {
        id: String(Date.now()),
        type: 'header',
        rowNumber: newHeaderNumber,
        name: 'New Header',
        startTime: newStartTime,
        duration: '00:00:00',
        endTime: newStartTime,
        talent: '',
        script: '',
        element: '',
        notes: '',
        color: '#888888',
        isFloating: false,
        segmentName: newHeaderNumber,
        status: 'upcoming',
        customFields: {},
      };

      let newItems;
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prevItems.length) {
        // Insert after the specified index
        newItems = [...prevItems];
        newItems.splice(insertAfterIndex + 1, 0, newHeader);
      } else {
        // Add to the end (default behavior)
        newItems = [...prevItems, newHeader];
      }

      // Renumber all headers after adding
      return renumberItems(newItems);
    });
  }, [setItems, renumberItems]);

  const deleteRow = useCallback((id: string) => {
    setItems(prevItems => {
      const itemToDelete = prevItems.find(item => item.id === id);
      const filteredItems = prevItems.filter(item => item.id !== id);
      
      // If we deleted a header, renumber all remaining headers
      if (itemToDelete?.type === 'header') {
        return renumberItems(filteredItems);
      }
      
      return filteredItems;
    });
  }, [setItems, renumberItems]);

  const deleteMultipleRows = useCallback((ids: string[]) => {
    setItems(prevItems => {
      const itemsToDelete = prevItems.filter(item => ids.includes(item.id));
      const hasHeaderDeleted = itemsToDelete.some(item => item.type === 'header');
      const filteredItems = prevItems.filter(item => !ids.includes(item.id));
      
      // If any deleted item was a header, renumber all remaining headers
      if (hasHeaderDeleted) {
        return renumberItems(filteredItems);
      }
      
      return filteredItems;
    });
  }, [setItems, renumberItems]);

  const addMultipleRows = useCallback((items: any[], calculateEndTime: (startTime: string, duration: string) => string) => {
    setItems(prevItems => {
      const lastItem = prevItems[prevItems.length - 1];
      const newStartTime = lastItem ? lastItem.endTime : '00:00:00';
      
      const newItems = items.map((item, index) => ({
        ...item,
        id: String(Date.now() + index),
        startTime: calculateEndTime(newStartTime, item.duration),
        endTime: calculateEndTime(calculateEndTime(newStartTime, item.duration), item.duration),
        isHeader: item.type === 'header',
        isFloated: item.isFloated || false,
        segmentName: item.segmentName || item.rowNumber,
        status: item.status || 'upcoming',
        customFields: item.customFields || {},
        script: item.script || '',
      }));
      return [...prevItems, ...newItems];
    });
  }, [setItems]);

  const toggleFloatRow = useCallback((id: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, isFloating: !item.isFloating, isFloated: !item.isFloated } : item
      )
    );
  }, [setItems]);

  return {
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    toggleFloatRow,
  };
};
