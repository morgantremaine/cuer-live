
import { useState, useCallback, useMemo } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { v4 as uuidv4 } from 'uuid';
import { RUNDOWN_DEFAULTS } from '@/constants/rundownDefaults';

export type { RundownItem } from '@/types/rundown';

export const useRundownItems = (
  markAsChanged: () => void,
  handleStructuralOperation?: (
    operationType: 'add_row' | 'delete_row' | 'move_rows' | 'copy_rows' | 'reorder' | 'add_header',
    operationData: any
  ) => void,
  recordOperation?: (operation: { type: 'cell_edit' | 'add_row' | 'add_header' | 'delete_row' | 'reorder', data: any, description: string }) => void
) => {
  const [items, setItems] = useState<RundownItem[]>([]);

  const updateItem = useCallback((id: string, updates: Partial<RundownItem>) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => 
        item.id === id ? { ...item, ...updates } : item
      );
      markAsChanged();
      return newItems;
    });
  }, [markAsChanged]);

  const addRow = useCallback((calculateEndTime: any, selectedRowId?: string | null, selectedRows?: Set<string>) => {
    const newItem: RundownItem = {
      id: uuidv4(),
      type: 'regular',
      rowNumber: '',
      name: RUNDOWN_DEFAULTS.DEFAULT_ROW_NAME,
      startTime: '',
      duration: RUNDOWN_DEFAULTS.NEW_ROW_DURATION,
      endTime: '',
      elapsedTime: RUNDOWN_DEFAULTS.DEFAULT_ELAPSED_TIME,
      talent: '',
      script: '',
      gfx: '',
      video: '',
      images: '',
      notes: '',
      color: RUNDOWN_DEFAULTS.DEFAULT_COLOR,
      isFloating: false,
      customFields: {}
    };

    setItems(prevItems => {
      let insertIndex = prevItems.length; // Default to end

      // Determine insertion point based on selection
      if (selectedRows && selectedRows.size > 0) {
        // Find the highest index of selected rows
        const selectedIndices = Array.from(selectedRows)
          .map(id => prevItems.findIndex(item => item.id === id))
          .filter(index => index !== -1);
        
        if (selectedIndices.length > 0) {
          insertIndex = Math.max(...selectedIndices) + 1;
        }
      } else if (selectedRowId) {
        // Find index of single selected row
        const selectedIndex = prevItems.findIndex(item => item.id === selectedRowId);
        if (selectedIndex !== -1) {
          insertIndex = selectedIndex + 1;
        }
      }

      const newItems = [...prevItems];
      newItems.splice(insertIndex, 0, newItem);
      
      // 🎯 NEW: Record add_row operation for undo/redo
      console.log('📝 Recording add_row:', { addedItemId: newItem.id, insertIndex });
      if (recordOperation) {
        recordOperation({
          type: 'add_row',
          data: { 
            addedItem: newItem,
            addedItemId: newItem.id, 
            addedIndex: insertIndex 
          },
          description: 'Add row'
        });
      }
      
      // Handle via coordination system if available
      if (handleStructuralOperation) {
        handleStructuralOperation('add_row', {
          newItems: [newItem],
          insertIndex
        });
      }
      
      markAsChanged();
      return newItems;
    });
  }, [markAsChanged]);

  const addHeader = useCallback((selectedRowId?: string | null, selectedRows?: Set<string>) => {
    setItems(prevItems => {
      const newItem: RundownItem = {
        id: uuidv4(),
        type: 'header',
        rowNumber: '', // Will be calculated properly by the calculation layer
        name: RUNDOWN_DEFAULTS.DEFAULT_HEADER_NAME,
        startTime: '',
        duration: RUNDOWN_DEFAULTS.NEW_HEADER_DURATION,
        endTime: '',
        elapsedTime: RUNDOWN_DEFAULTS.DEFAULT_ELAPSED_TIME,
        talent: '',
        script: '',
        gfx: '',
        video: '',
        images: '',
        notes: '',
        color: RUNDOWN_DEFAULTS.DEFAULT_COLOR,
        isFloating: false,
        customFields: {}
      };

      let insertIndex = prevItems.length; // Default to end

      // Determine insertion point based on selection
      if (selectedRows && selectedRows.size > 0) {
        // Find the highest index of selected rows
        const selectedIndices = Array.from(selectedRows)
          .map(id => prevItems.findIndex(item => item.id === id))
          .filter(index => index !== -1);
        
        if (selectedIndices.length > 0) {
          insertIndex = Math.max(...selectedIndices) + 1;
        }
      } else if (selectedRowId) {
        // Find index of single selected row
        const selectedIndex = prevItems.findIndex(item => item.id === selectedRowId);
        if (selectedIndex !== -1) {
          insertIndex = selectedIndex + 1;
        }
      }

      const newItems = [...prevItems];
      newItems.splice(insertIndex, 0, newItem);
      
      // 🎯 NEW: Record add_header operation for undo/redo
      console.log('📝 Recording add_header:', { addedItemId: newItem.id, insertIndex });
      if (recordOperation) {
        recordOperation({
          type: 'add_header',
          data: { 
            addedItem: newItem,
            addedItemId: newItem.id, 
            addedIndex: insertIndex 
          },
          description: 'Add header'
        });
      }
      
      // Handle via coordination system if available
      if (handleStructuralOperation) {
        handleStructuralOperation('add_header', {
          newItems: [newItem],
          insertIndex
        });
      }
      
      markAsChanged();
      return newItems;
    });
  }, [markAsChanged]);

  const deleteRow = useCallback((id: string) => {
    setItems(prevItems => {
      const deletedIndex = prevItems.findIndex(item => item.id === id);
      const deletedItem = prevItems[deletedIndex];
      const newItems = prevItems.filter(item => item.id !== id);
      
      // 🎯 NEW: Record delete_row operation for undo/redo
      console.log('📝 Recording delete_row:', { deletedItem, deletedIndex });
      if (recordOperation && deletedItem) {
        recordOperation({
          type: 'delete_row',
          data: { deletedItem, deletedIndex },
          description: `Delete "${deletedItem.name || 'row'}"`
        });
      }
      
      // Handle via coordination system if available
      if (handleStructuralOperation) {
        handleStructuralOperation('delete_row', {
          deletedIds: [id]
        });
      }
      
      markAsChanged();
      return newItems;
    });
  }, [markAsChanged, handleStructuralOperation, recordOperation]);

  const deleteMultipleRows = useCallback((ids: string[]) => {
    setItems(prevItems => {
      const newItems = prevItems.filter(item => !ids.includes(item.id));
      
      // Handle via coordination system if available
      if (handleStructuralOperation) {
        handleStructuralOperation('delete_row', {
          deletedIds: ids
        });
      }
      
      markAsChanged();
      return newItems;
    });
  }, [markAsChanged, handleStructuralOperation]);

  const addMultipleRows = useCallback((newItems: RundownItem[]) => {
    setItems(prevItems => {
      const allItems = [...prevItems, ...newItems];
      markAsChanged();
      return allItems;
    });
  }, [markAsChanged]);

  const toggleFloatRow = useCallback((id: string) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => 
        item.id === id ? { ...item, isFloating: !item.isFloating } : item
      );
      markAsChanged();
      return newItems;
    });
  }, [markAsChanged]);

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
  }, [items]);

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
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration
  };
};
