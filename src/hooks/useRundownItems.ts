
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
      name: '',
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
