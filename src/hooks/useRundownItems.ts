import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';

export interface RundownItem {
  id: string;
  type: 'regular' | 'header';
  rowNumber: string;
  name: string;
  startTime: string;
  duration: string;
  endTime: string;
  talent: string;
  notes: string;
  color: string;
  isFloating: boolean;
  isHeader?: boolean;
  isFloated?: boolean;
  segmentName?: string;
  status?: 'upcoming' | 'current' | 'completed';
  customFields?: { [key: string]: string };
}

export const useRundownItems = () => {
  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();
  
  const [items, setItems] = useState<RundownItem[]>([
    {
      id: '1',
      type: 'header',
      rowNumber: 'A',
      name: 'SHOW OPEN',
      startTime: '09:00:00',
      duration: '00:05:00',
      endTime: '09:05:00',
      talent: '',
      notes: '',
      color: '#3B82F6',
      isFloating: false,
      isHeader: true,
      segmentName: 'A',
      status: 'upcoming',
    },
    {
      id: '2',
      type: 'regular',
      rowNumber: '1',
      name: 'Welcome & Introductions',
      startTime: '09:05:00',
      duration: '00:03:00',
      endTime: '09:08:00',
      talent: 'Host',
      notes: 'Introduce today\'s guests',
      color: '#10B981',
      isFloating: false,
      isHeader: false,
      isFloated: false,
      status: 'upcoming',
    },
    {
      id: '3',
      type: 'regular',
      rowNumber: '2',
      name: 'Main Interview Segment',
      startTime: '09:08:00',
      duration: '00:20:00',
      endTime: '09:28:00',
      talent: 'Host, Guest',
      notes: 'Focus on new product launch',
      color: '#F59E0B',
      isFloating: false,
      isHeader: false,
      isFloated: false,
      status: 'upcoming',
    },
    {
      id: '4',
      type: 'regular',
      rowNumber: '3',
      name: 'Commercial Break',
      startTime: '09:28:00',
      duration: '00:02:00',
      endTime: '09:30:00',
      talent: '',
      notes: 'Sponsor: TechCorp',
      color: '#EF4444',
      isFloating: false,
      isHeader: false,
      isFloated: false,
      status: 'upcoming',
    },
    {
      id: '5',
      type: 'header',
      rowNumber: 'B',
      name: 'SEGMENT 2',
      startTime: '09:30:00',
      duration: '00:15:00',
      endTime: '09:45:00',
      talent: '',
      notes: '',
      color: '#8B5CF6',
      isFloating: false,
      isHeader: true,
      segmentName: 'B',
      status: 'upcoming',
    },
    {
      id: '6',
      type: 'regular',
      rowNumber: '4',
      name: 'Q&A Session',
      startTime: '09:45:00',
      duration: '00:10:00',
      endTime: '09:55:00',
      talent: 'Host, Guest',
      notes: 'Take live caller questions',
      color: '#06B6D4',
      isFloating: false,
      isHeader: false,
      isFloated: false,
      status: 'upcoming',
    },
    {
      id: '7',
      type: 'regular',
      rowNumber: '5',
      name: 'Closing Remarks',
      startTime: '09:55:00',
      duration: '00:05:00',
      endTime: '10:00:00',
      talent: 'Host',
      notes: 'Thank guests, preview next episode',
      color: '#84CC16',
      isFloating: false,
      isHeader: false,
      isFloated: false,
      status: 'upcoming',
    },
  ]);

  // Load existing rundown data when rundownId changes
  useEffect(() => {
    if (loading) return;
    
    if (rundownId && savedRundowns.length > 0) {
      console.log('Loading rundown with ID:', rundownId);
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      
      if (existingRundown && existingRundown.items) {
        console.log('Found existing rundown, loading items:', existingRundown.items.length);
        // Ensure loaded items have all required properties
        const itemsWithDefaults = existingRundown.items.map(item => ({
          ...item,
          isHeader: item.type === 'header',
          isFloated: item.isFloated || false,
          segmentName: item.segmentName || item.rowNumber,
          status: item.status || 'upcoming',
          customFields: item.customFields || {},
        }));
        setItems(itemsWithDefaults);
      } else {
        console.log('Rundown not found or has no items, keeping default');
      }
    } else if (!rundownId) {
      console.log('No rundown ID, using default items for new rundown');
      // Reset to default for new rundowns - items already have defaults above
    }
  }, [rundownId, savedRundowns, loading]);

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
        duration: '00:05:00',
        endTime: calculateEndTime(newStartTime, '00:05:00'),
        talent: '',
        notes: '',
        color: '#FFFFFF',
        isFloating: false,
        isHeader: false,
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
        isHeader: true,
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

  const getRowNumber = useCallback((index: number) => {
    // Filter out header rows to calculate the correct row number
    const regularItems = items.filter(item => item.type === 'regular');
    return String(regularItems.length > 0 ? index + 1 : 1);
  }, [items]);

  const toggleFloatRow = useCallback((id: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, isFloating: !item.isFloating, isFloated: !item.isFloated } : item
      )
    );
  }, [setItems]);

  const calculateTotalRuntime = useCallback(() => {
    let totalSeconds = items.reduce((acc, item) => {
      const [hours, minutes, seconds] = item.duration.split(':').map(Number);
      return acc + (hours * 3600) + (minutes * 60) + seconds;
    }, 0);
  
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
  
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
  
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }, [items]);

  const calculateHeaderDuration = useCallback((index: number) => {
    if (index < 0 || index >= items.length || items[index].type !== 'header') {
      return '00:00:00';
    }
  
    let totalSeconds = 0;
    let i = index + 1;
  
    while (i < items.length && items[i].type !== 'header') {
      const [hours, minutes, seconds] = items[i].duration.split(':').map(Number);
      totalSeconds += (hours * 3600) + (minutes * 60) + seconds;
      i++;
    }
  
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
  
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
  
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
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
