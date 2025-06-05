import { useState, useCallback, useMemo } from 'react';
import { RundownItem, SegmentItem, HeaderItem } from '@/types/rundown';
import { v4 as uuidv4 } from 'uuid';

export { RundownItem, SegmentItem, HeaderItem };

export const useRundownItems = (markAsChanged: () => void) => {
  const [items, setItems] = useState<RundownItem[]>([]);

  const updateItem = useCallback((id: string, field: string, value: string) => {
    setItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
    markAsChanged();
  }, [markAsChanged]);

  const addRow = useCallback((calculateEndTime: (startTime: string, duration: string) => string, insertAfterIndex?: number) => {
    const newItem: SegmentItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'segment',
      title: '',
      duration: '00:01:00',
      startTime: '00:00:00',
      endTime: '00:01:00',
      script: '',
      status: 'upcoming' as const,
      isFloated: false,
      color: ''
    };

    setItems(prev => {
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0) {
        // Insert after the specified index
        const newItems = [...prev];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
        return newItems;
      } else {
        // Add at the end
        return [...prev, newItem];
      }
    });
    markAsChanged();
  }, [markAsChanged]);

  const addHeader = useCallback((insertAfterIndex?: number) => {
    const newItem: HeaderItem = {
      id: `header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'header',
      title: 'New Header',
      status: 'upcoming' as const,
      isFloated: false,
      color: ''
    };

    setItems(prev => {
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0) {
        // Insert after the specified index
        const newItems = [...prev];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
        return newItems;
      } else {
        // Add at the end
        return [...prev, newItem];
      }
    });
    markAsChanged();
  }, [markAsChanged]);

  const deleteRow = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    markAsChanged();
  }, [markAsChanged]);

  const deleteMultipleRows = useCallback((ids: string[]) => {
    setItems(prev => prev.filter(item => !ids.includes(item.id)));
    markAsChanged();
  }, [markAsChanged]);

  const addMultipleRows = useCallback((newItems: RundownItem[], calculateEndTime: (startTime: string, duration: string) => string) => {
    setItems(prev => [...prev, ...newItems]);
    markAsChanged();
  }, [markAsChanged]);

  const toggleFloatRow = useCallback((id: string) => {
    setItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, isFloated: !item.isFloated } : item
      )
    );
    markAsChanged();
  }, [markAsChanged]);

  const getRowNumber = useCallback((index: number) => {
    return (index + 1).toString();
  }, []);

  const calculateTotalRuntime = useCallback(() => {
    let totalMinutes = 0;
    
    items.forEach(item => {
      if (item.type === 'segment' && item.duration) {
        const [hours, minutes, seconds] = item.duration.split(':').map(Number);
        totalMinutes += hours * 60 + minutes + seconds / 60;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.floor((totalMinutes % 1) * 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [items]);

  const calculateHeaderDuration = useCallback((headerIndex: number) => {
    let totalMinutes = 0;
    
    for (let i = headerIndex + 1; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'header') break;
      
      if (item.type === 'segment' && item.duration) {
        const [hours, minutes, seconds] = item.duration.split(':').map(Number);
        totalMinutes += hours * 60 + minutes + seconds / 60;
      }
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.floor((totalMinutes % 1) * 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [items]);

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
