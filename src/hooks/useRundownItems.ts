import { useState, useCallback, useRef } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { v4 as uuidv4 } from 'uuid';

export type { RundownItem } from '@/types/rundown';

export const useRundownItems = () => {
  const [items, setItems] = useState<RundownItem[]>([]);
  const [itemsUpdateTrigger, setItemsUpdateTrigger] = useState(0);
  const [forceUpdateId, setForceUpdateId] = useState(0);
  const markAsChangedRef = useRef<(() => void) | undefined>(undefined);

  const callMarkAsChanged = useCallback(() => {
    if (markAsChangedRef.current) {
      markAsChangedRef.current();
    }
  }, []);

  // Function to set the markAsChanged callback from outside
  const setMarkAsChangedCallback = useCallback((callback: () => void) => {
    markAsChangedRef.current = callback;
  }, []);

  // Enhanced setItems that ensures new references and triggers updates
  const enhancedSetItems = useCallback((newItems: RundownItem[] | ((prevItems: RundownItem[]) => RundownItem[])) => {
    setItems(prevItems => {
      const updatedItems = typeof newItems === 'function' ? newItems(prevItems) : newItems;
      
      // Force multiple update triggers to ensure React re-renders
      setItemsUpdateTrigger(prev => prev + 1);
      setForceUpdateId(prev => prev + 1);
      
      // Always create completely new array and objects
      const freshItems = updatedItems.map(item => ({ ...item }));
      
      console.log('🔄 Items updated, new count:', freshItems.length, 'trigger:', itemsUpdateTrigger + 1);
      
      return freshItems;
    });
  }, [itemsUpdateTrigger]);

  const updateItem = useCallback((id: string, updates: Partial<RundownItem>) => {
    enhancedSetItems(prevItems => {
      const newItems = prevItems.map(item => 
        item.id === id ? { ...item, ...updates } : { ...item }
      );
      callMarkAsChanged();
      return newItems;
    });
  }, [enhancedSetItems, callMarkAsChanged]);

  // ... keep existing code (addRow, addHeader, deleteRow, deleteMultipleRows, addMultipleRows functions)

  const addRow = useCallback((calculateEndTime: (startTime: string, duration: string) => string, selectedRowId?: string) => {
    const newItem: RundownItem = {
      id: uuidv4(),
      type: 'regular',
      rowNumber: '',
      name: '',
      startTime: '',
      duration: '',
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false
    };

    enhancedSetItems(prevItems => {
      let newItems;
      if (selectedRowId) {
        const selectedIndex = prevItems.findIndex(item => item.id === selectedRowId);
        if (selectedIndex !== -1) {
          newItems = [...prevItems];
          newItems.splice(selectedIndex + 1, 0, newItem);
        } else {
          newItems = [...prevItems, newItem];
        }
      } else {
        newItems = [...prevItems, newItem];
      }
      
      callMarkAsChanged();
      return newItems;
    });
  }, [enhancedSetItems, callMarkAsChanged]);

  const addHeader = useCallback((selectedRowId?: string) => {
    const newItem: RundownItem = {
      id: uuidv4(),
      type: 'header',
      rowNumber: '',
      name: 'New Header',
      startTime: '',
      duration: '',
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false
    };

    enhancedSetItems(prevItems => {
      let newItems;
      if (selectedRowId) {
        const selectedIndex = prevItems.findIndex(item => item.id === selectedRowId);
        if (selectedIndex !== -1) {
          newItems = [...prevItems];
          newItems.splice(selectedIndex + 1, 0, newItem);
        } else {
          newItems = [...prevItems, newItem];
        }
      } else {
        newItems = [...prevItems, newItem];
      }
      
      callMarkAsChanged();
      return newItems;
    });
  }, [enhancedSetItems, callMarkAsChanged]);

  const deleteRow = useCallback((id: string) => {
    enhancedSetItems(prevItems => {
      const newItems = prevItems.filter(item => item.id !== id);
      callMarkAsChanged();
      return newItems;
    });
  }, [enhancedSetItems, callMarkAsChanged]);

  const deleteMultipleRows = useCallback((ids: string[]) => {
    enhancedSetItems(prevItems => {
      const newItems = prevItems.filter(item => !ids.includes(item.id));
      callMarkAsChanged();
      return newItems;
    });
  }, [enhancedSetItems, callMarkAsChanged]);

  const addMultipleRows = useCallback((newItems: RundownItem[]) => {
    enhancedSetItems(prevItems => {
      const allItems = [...prevItems, ...newItems];
      callMarkAsChanged();
      return allItems;
    });
  }, [enhancedSetItems, callMarkAsChanged]);

  // Force re-calculation with multiple dependencies
  const getRowNumber = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return '';
    
    const item = items[index];
    if (!item) return '';
    
    // For headers, count how many headers we've seen so far
    if (item.type === 'header') {
      let headerCount = 0;
      for (let i = 0; i <= index; i++) {
        if (items[i]?.type === 'header') {
          headerCount++;
        }
      }
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return letters[headerCount - 1] || 'A';
    }
    
    // For regular items, find which segment they belong to
    let currentSegmentLetter = 'A';
    let itemCountInSegment = 0;
    
    // Go through items up to current index
    for (let i = 0; i <= index; i++) {
      const currentItem = items[i];
      if (!currentItem) continue;
      
      if (currentItem.type === 'header') {
        // Update which segment we're in
        let headerCount = 0;
        for (let j = 0; j <= i; j++) {
          if (items[j]?.type === 'header') {
            headerCount++;
          }
        }
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        currentSegmentLetter = letters[headerCount - 1] || 'A';
        itemCountInSegment = 0; // Reset count for new segment
      } else if (currentItem.type === 'regular') {
        itemCountInSegment++;
      }
    }
    
    return `${currentSegmentLetter}${itemCountInSegment}`;
  }, [items, itemsUpdateTrigger, forceUpdateId]);

  const toggleFloatRow = useCallback((id: string) => {
    enhancedSetItems(prevItems => {
      const newItems = prevItems.map(item => 
        item.id === id ? { ...item, isFloating: !item.isFloating } : { ...item }
      );
      callMarkAsChanged();
      return newItems;
    });
  }, [enhancedSetItems, callMarkAsChanged]);

  const calculateTotalRuntime = useCallback(() => {
    let totalSeconds = 0;
    items.forEach(item => {
      if (item.type === 'regular' && item.duration) {
        const duration = item.duration;
        const parts = duration.split(':');
        if (parts.length === 2) {
          const minutes = parseInt(parts[0]) || 0;
          const seconds = parseInt(parts[1]) || 0;
          totalSeconds += minutes * 60 + seconds;
        }
      }
    });
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }, [items, itemsUpdateTrigger, forceUpdateId]);

  const calculateHeaderDuration = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return '';
    
    const headerItem = items[index];
    if (!headerItem || headerItem.type !== 'header') return '';
    
    let totalSeconds = 0;
    
    // Sum up durations of all regular items after this header until the next header
    for (let i = index + 1; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'header') break; // Stop at next header
      
      if (item.type === 'regular' && item.duration) {
        const duration = item.duration;
        const parts = duration.split(':');
        if (parts.length === 2) {
          const minutes = parseInt(parts[0]) || 0;
          const seconds = parseInt(parts[1]) || 0;
          totalSeconds += minutes * 60 + seconds;
        }
      }
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }, [items, itemsUpdateTrigger, forceUpdateId]);

  return {
    items,
    setItems: enhancedSetItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration,
    setMarkAsChangedCallback,
    itemsUpdateTrigger,
    forceUpdateId
  };
};
