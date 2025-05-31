
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

export const useRundownItemActions = (
  setItems: React.Dispatch<React.SetStateAction<RundownItem[]>>,
  saveUndoState?: (type: string, previousState: RundownItem[], currentState: RundownItem[], description: string) => void
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
        return item;
      }
    });
  }, []);

  const updateItem = useCallback((id: string, field: string, value: string) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.id !== id) return item;
        
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
        
        return { ...item, [field]: value };
      });

      if (saveUndoState) {
        saveUndoState('UPDATE_ITEM', prevItems, newItems, `Update ${field}`);
      }

      return newItems;
    });
  }, [setItems, saveUndoState]);

  const addRow = useCallback((calculateEndTime: (startTime: string, duration: string) => string, insertAfterIndex?: number) => {
    setItems(prevItems => {
      const newRowNumber = String(prevItems.filter(item => item.type === 'regular').length + 1);
      
      let newStartTime: string;
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prevItems.length) {
        const itemAtIndex = prevItems[insertAfterIndex];
        newStartTime = calculateEndTime(itemAtIndex.startTime, itemAtIndex.duration);
      } else {
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
        notes: '',
        color: '#FFFFFF',
        isFloating: false,
        isFloated: false,
        status: 'upcoming',
        customFields: {},
      };

      let newItems;
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prevItems.length) {
        newItems = [...prevItems];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
      } else {
        newItems = [...prevItems, newItem];
      }

      if (saveUndoState) {
        saveUndoState('ADD_ROW', prevItems, newItems, 'Add row');
      }

      return newItems;
    });
  }, [setItems, saveUndoState]);

  const addHeader = useCallback((insertAfterIndex?: number) => {
    setItems(prevItems => {
      const newHeaderNumber = String.fromCharCode(65 + prevItems.filter(item => item.type === 'header').length);
      
      let newStartTime: string;
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prevItems.length) {
        const itemAtIndex = prevItems[insertAfterIndex];
        newStartTime = itemAtIndex.endTime;
      } else {
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
        notes: '',
        color: '#888888',
        isFloating: false,
        segmentName: newHeaderNumber,
        status: 'upcoming',
        customFields: {},
      };

      let newItems;
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prevItems.length) {
        newItems = [...prevItems];
        newItems.splice(insertAfterIndex + 1, 0, newHeader);
      } else {
        newItems = [...prevItems, newHeader];
      }

      const finalItems = renumberItems(newItems);

      if (saveUndoState) {
        saveUndoState('ADD_HEADER', prevItems, finalItems, 'Add header');
      }

      return finalItems;
    });
  }, [setItems, renumberItems, saveUndoState]);

  const deleteRow = useCallback((id: string) => {
    setItems(prevItems => {
      const itemToDelete = prevItems.find(item => item.id === id);
      const filteredItems = prevItems.filter(item => item.id !== id);
      
      const finalItems = itemToDelete?.type === 'header' ? renumberItems(filteredItems) : filteredItems;

      if (saveUndoState) {
        saveUndoState('DELETE_ROW', prevItems, finalItems, 'Delete row');
      }
      
      return finalItems;
    });
  }, [setItems, renumberItems, saveUndoState]);

  const deleteMultipleRows = useCallback((ids: string[]) => {
    setItems(prevItems => {
      const itemsToDelete = prevItems.filter(item => ids.includes(item.id));
      const hasHeaderDeleted = itemsToDelete.some(item => item.type === 'header');
      const filteredItems = prevItems.filter(item => !ids.includes(item.id));
      
      const finalItems = hasHeaderDeleted ? renumberItems(filteredItems) : filteredItems;

      if (saveUndoState) {
        saveUndoState('DELETE_MULTIPLE_ROWS', prevItems, finalItems, `Delete ${ids.length} rows`);
      }
      
      return finalItems;
    });
  }, [setItems, renumberItems, saveUndoState]);

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

      const finalItems = [...prevItems, ...newItems];

      if (saveUndoState) {
        saveUndoState('ADD_MULTIPLE_ROWS', prevItems, finalItems, `Add ${items.length} rows`);
      }

      return finalItems;
    });
  }, [setItems, saveUndoState]);

  const toggleFloatRow = useCallback((id: string) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item =>
        item.id === id ? { ...item, isFloating: !item.isFloating, isFloated: !item.isFloated } : item
      );

      if (saveUndoState) {
        saveUndoState('TOGGLE_FLOAT', prevItems, newItems, 'Toggle float');
      }

      return newItems;
    });
  }, [setItems, saveUndoState]);

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
