
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

export const useRundownItemActions = (
  setItems: React.Dispatch<React.SetStateAction<RundownItem[]>>
) => {
  const updateItem = useCallback((id: string, field: string, value: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }, [setItems]);

  const addRow = useCallback((calculateEndTime: (startTime: string, duration: string) => string) => {
    setItems(prevItems => {
      const newRowNumber = String(prevItems.filter(item => item.type === 'regular').length + 1);
      const lastItem = prevItems[prevItems.length - 1];
      const newStartTime = lastItem ? calculateEndTime(lastItem.startTime, lastItem.duration) : '00:00:00';

      const newItem: RundownItem = {
        id: String(Date.now()),
        type: 'regular',
        rowNumber: newRowNumber,
        name: 'New Segment',
        startTime: newStartTime,
        duration: '00:00:00',
        endTime: calculateEndTime(newStartTime, '00:00:00'),
        talent: '',
        notes: '',
        color: '#FFFFFF',
        isFloating: false,
        isFloated: false,
        status: 'upcoming',
        customFields: {},
      };
      return [...prevItems, newItem];
    });
  }, [setItems]);

  const addHeader = useCallback(() => {
    setItems(prevItems => {
      const newHeaderNumber = String.fromCharCode(65 + prevItems.filter(item => item.type === 'header').length);
      const lastItem = prevItems[prevItems.length - 1];
      const newStartTime = lastItem ? lastItem.endTime : '00:00:00';

      const newHeader: RundownItem = {
        id: String(Date.now()),
        type: 'header',
        rowNumber: newHeaderNumber,
        name: 'New Header',
        startTime: newStartTime,
        duration: '00:00:00',
        endTime: newStartTime,
        talent: '',
        notes: '',
        color: '#888888',
        isFloating: false,
        segmentName: newHeaderNumber,
        status: 'upcoming',
        customFields: {},
      };
      return [...prevItems, newHeader];
    });
  }, [setItems]);

  const deleteRow = useCallback((id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  }, [setItems]);

  const deleteMultipleRows = useCallback((ids: string[]) => {
    setItems(prevItems => prevItems.filter(item => !ids.includes(item.id)));
  }, [setItems]);

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
      }));
      return [...prevItems, ...newItems];
    });
  }, [setItems]);

  const toggleFloatRow = useCallback((id: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, isFloating: !item.isFloating, isFloated: !item.isFloating } : item
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
