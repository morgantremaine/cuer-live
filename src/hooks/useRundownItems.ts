
import { useState, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { generateId } from '@/utils/idGenerator';
import { useUndo } from './useUndo';

export const useRundownItems = (markAsChanged?: () => void) => {
  const [items, setItems] = useState<RundownItem[]>([]);
  const {
    undo: undoItems,
    redo: redoItems,
    set: setItemsWithHistory,
    canUndo,
    canRedo,
    lastAction
  } = useUndo<RundownItem[]>([], setItems);

  const updateItem = useCallback((id: string, field: string, value: string) => {
    setItemsWithHistory(prev => {
      return prev.map(item => {
        if (item.id === id) {
          // Handle nested customFields updates
          if (field.startsWith('customFields.')) {
            const customFieldKey = field.split('.')[1];
            return {
              ...item,
              customFields: {
                ...item.customFields,
                [customFieldKey]: value
              }
            };
          } else {
            return { ...item, [field]: value };
          }
        }
        return item;
      });
    });
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged, setItemsWithHistory]);

  const deleteRow = useCallback((id: string) => {
    setItemsWithHistory(prev => prev.filter(item => item.id !== id));
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged, setItemsWithHistory]);

  const toggleFloat = useCallback((id: string) => {
    setItemsWithHistory(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isFloating: !item.isFloating, isFloated: !item.isFloating } : item
      )
    );
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged, setItemsWithHistory]);

  const addRow = useCallback((type: 'regular' | 'header' = 'regular') => {
    const newItem: RundownItem = {
      id: generateId(),
      type,
      rowNumber: '',
      name: '', // Empty for both types - placeholder will handle display
      startTime: '00:00:00',
      duration: type === 'header' ? '' : '00:00',
      endTime: '00:00:00',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '#FFFFFF',
      isFloating: false,
      customFields: {}
    };

    setItemsWithHistory(prev => [...prev, newItem]);
    
    // Mark as changed when adding a row
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged, setItemsWithHistory]);

  // Add missing addHeader function
  const addHeader = useCallback((insertAfterIndex?: number) => {
    const newItem: RundownItem = {
      id: generateId(),
      type: 'header',
      rowNumber: '',
      name: '', // Empty - placeholder will show "Header Title"
      startTime: '00:00:00',
      duration: '',
      endTime: '00:00:00',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '#FFFFFF',
      isFloating: false,
      customFields: {}
    };

    setItemsWithHistory(prev => {
      if (insertAfterIndex !== undefined) {
        const newItems = [...prev];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
        return newItems;
      }
      return [...prev, newItem];
    });
    
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged, setItemsWithHistory]);

  // Add missing deleteMultipleRows function
  const deleteMultipleRows = useCallback((ids: string[]) => {
    setItemsWithHistory(prev => prev.filter(item => !ids.includes(item.id)));
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged, setItemsWithHistory]);

  // Add missing addMultipleRows function
  const addMultipleRows = useCallback((newItems: RundownItem[]) => {
    const itemsWithNewIds = newItems.map(item => ({ ...item, id: generateId() }));
    setItemsWithHistory(prev => [...prev, ...itemsWithNewIds]);
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged, setItemsWithHistory]);

  // Add missing getRowNumber function
  const getRowNumber = useCallback((index: number) => {
    return (index + 1).toString();
  }, []);

  // Add missing toggleFloatRow function
  const toggleFloatRow = useCallback((id: string) => {
    toggleFloat(id);
  }, [toggleFloat]);

  // Add missing calculateTotalRuntime function - returns formatted string
  const calculateTotalRuntime = useCallback(() => {
    const totalSeconds = items.reduce((total, item) => {
      if (item.type === 'regular' && item.duration) {
        const [minutes, seconds] = item.duration.split(':').map(Number);
        return total + (minutes * 60) + seconds;
      }
      return total;
    }, 0);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [items]);

  // Add missing calculateHeaderDuration function
  const calculateHeaderDuration = useCallback((index: number) => {
    // Calculate duration of items under this header
    let duration = 0;
    for (let i = index + 1; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'header') break;
      if (item.type === 'regular' && item.duration) {
        const [minutes, seconds] = item.duration.split(':').map(Number);
        duration += (minutes * 60) + seconds;
      }
    }
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [items]);

  const pasteRows = useCallback((pastedItems: RundownItem[]) => {
    // Generate new IDs for the pasted items
    const newItems = pastedItems.map(item => ({ ...item, id: generateId() }));
    setItemsWithHistory(prev => [...prev, ...newItems]);
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged, setItemsWithHistory]);

  const reorderItems = useCallback((startIndex: number, endIndex: number) => {
    setItemsWithHistory(prevItems => {
      const reorderedItems = [...prevItems];
      const [movedItem] = reorderedItems.splice(startIndex, 1);
      reorderedItems.splice(endIndex, 0, movedItem);
      return reorderedItems;
    });
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged, setItemsWithHistory]);

  const deleteAllRows = useCallback(() => {
    setItemsWithHistory([]);
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged, setItemsWithHistory]);

  return {
    items,
    updateItem,
    deleteRow,
    toggleFloat,
    addRow,
    addHeader,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration,
    pasteRows,
    reorderItems,
    deleteAllRows,
    setItems,
    undoItems,
    redoItems,
    canUndo,
    canRedo,
    lastAction,
    setItemsWithHistory
  };
};

// Re-export the RundownItem type for backward compatibility
export type { RundownItem } from '@/types/rundown';
