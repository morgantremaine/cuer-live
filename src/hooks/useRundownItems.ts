
import { useState } from 'react';

export interface RundownItem {
  id: string;
  segmentName: string;
  duration: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: 'upcoming' | 'current' | 'completed';
  color?: string;
  isHeader?: boolean;
  isFloated?: boolean;
  customFields?: { [key: string]: string };
}

export const useRundownItems = () => {
  const [items, setItems] = useState<RundownItem[]>([
    {
      id: '1',
      segmentName: 'A',
      duration: '',
      startTime: '',
      endTime: '',
      notes: '',
      status: 'upcoming',
      isHeader: true
    },
    {
      id: '2',
      segmentName: 'Opening Headlines',
      duration: '00:02:30',
      startTime: '18:00:00',
      endTime: '18:02:30',
      notes: 'Live from studio A',
      status: 'upcoming'
    },
    {
      id: '3',
      segmentName: 'Weather Report',
      duration: '00:03:00',
      startTime: '18:02:30',
      endTime: '18:05:30',
      notes: 'Green screen setup',
      status: 'upcoming'
    },
    {
      id: '4',
      segmentName: 'Breaking News',
      duration: '00:05:00',
      startTime: '18:05:30',
      endTime: '18:10:30',
      notes: 'VTR ready',
      status: 'upcoming'
    }
  ]);

  const timeToSeconds = (timeStr: string) => {
    if (!timeStr) return 0;
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  const secondsToTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateTotalRuntime = () => {
    const totalSeconds = items
      .filter(item => !item.isHeader && !item.isFloated && item.duration)
      .reduce((total, item) => total + timeToSeconds(item.duration), 0);
    return secondsToTime(totalSeconds);
  };

  const calculateHeaderDuration = (headerIndex: number) => {
    const nextHeaderIndex = items.findIndex((item, index) => 
      index > headerIndex && item.isHeader
    );
    
    const endIndex = nextHeaderIndex === -1 ? items.length : nextHeaderIndex;
    const headerItems = items.slice(headerIndex + 1, endIndex);
    
    const totalSeconds = headerItems
      .filter(item => !item.isHeader && !item.isFloated && item.duration)
      .reduce((total, item) => total + timeToSeconds(item.duration), 0);
    
    return secondsToTime(totalSeconds);
  };

  const updateItem = (id: string, field: string, value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        let updatedItem = { ...item };
        
        if (field.startsWith('custom_')) {
          updatedItem.customFields = { ...updatedItem.customFields, [field]: value };
        } else {
          updatedItem = { ...updatedItem, [field]: value };
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const toggleFloatRow = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isFloated: !item.isFloated } : item
    ));
  };

  const addRow = (calculateEndTime: (startTime: string, duration: string) => string) => {
    const newId = (items.length + 1).toString();
    const lastItem = items[items.length - 1];
    const newStartTime = lastItem && !lastItem.isHeader ? lastItem.endTime : '18:00:00';
    
    const newItem: RundownItem = {
      id: newId,
      segmentName: 'New Segment',
      duration: '00:00:00',
      startTime: newStartTime,
      endTime: calculateEndTime(newStartTime, '00:00:00'),
      notes: '',
      status: 'upcoming',
      customFields: {}
    };
    
    setItems(prev => [...prev, newItem]);
  };

  const addMultipleRows = (itemsToAdd: RundownItem[], calculateEndTime: (startTime: string, duration: string) => string) => {
    const lastItem = items[items.length - 1];
    let currentStartTime = lastItem && !lastItem.isHeader ? lastItem.endTime : '18:00:00';
    
    const newItems = itemsToAdd.map(item => {
      const newId = (items.length + Math.random()).toString();
      const newItem = {
        ...item,
        id: newId,
        startTime: currentStartTime,
        endTime: calculateEndTime(currentStartTime, item.duration)
      };
      currentStartTime = newItem.endTime;
      return newItem;
    });
    
    setItems(prev => [...prev, ...newItems]);
  };

  const addHeader = () => {
    const newId = (items.length + 1).toString();
    const nextLetter = String.fromCharCode(65 + getNextHeaderLetter());
    
    const newHeader: RundownItem = {
      id: newId,
      segmentName: nextLetter,
      duration: '',
      startTime: '',
      endTime: '',
      notes: '',
      status: 'upcoming',
      isHeader: true,
      customFields: {}
    };
    
    setItems(prev => [...prev, newHeader]);
  };

  const getNextHeaderLetter = () => {
    const headers = items.filter(item => item.isHeader);
    return headers.length;
  };

  const deleteRow = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const deleteMultipleRows = (idsToDelete: string[]) => {
    setItems(prev => prev.filter(item => !idsToDelete.includes(item.id)));
  };

  const getRowNumber = (index: number) => {
    if (items[index].isHeader) {
      return items[index].segmentName;
    }

    let currentHeaderLetter = 'A';
    let rowCount = 0;

    for (let i = 0; i <= index; i++) {
      if (items[i].isHeader) {
        currentHeaderLetter = items[i].segmentName;
        rowCount = 0;
      } else {
        rowCount++;
      }
    }

    return `${currentHeaderLetter}${rowCount}`;
  };

  return {
    items,
    setItems,
    updateItem,
    addRow,
    addMultipleRows,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration
  };
};
