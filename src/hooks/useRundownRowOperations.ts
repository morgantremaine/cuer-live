
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

interface UseRundownRowOperationsProps {
  selectedRows: Set<string>;
  deleteMultipleRows: (ids: string[]) => void;
  clearSelection: () => void;
  addRow: (calculateEndTime: (startTime: string, duration: string) => string, insertAfterIndex?: number) => void;
  addHeader: (insertAfterIndex?: number) => void;
  items: RundownItem[];
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  markAsChanged: () => void;
}

export const useRundownRowOperations = ({
  selectedRows,
  deleteMultipleRows,
  clearSelection,
  addRow: coreAddRow,
  addHeader: coreAddHeader,
  items,
  setItems,
  calculateEndTime,
  markAsChanged
}: UseRundownRowOperationsProps) => {
  
  const handleDeleteSelectedRows = useCallback(() => {
    const selectedIds = Array.from(selectedRows);
    if (selectedIds.length > 0) {
      deleteMultipleRows(selectedIds);
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection]);

  const addRow = useCallback((calculateEndTimeFn: (startTime: string, duration: string) => string) => {
    coreAddRow(calculateEndTimeFn);
  }, [coreAddRow]);

  const addHeader = useCallback(() => {
    coreAddHeader();
  }, [coreAddHeader]);

  const handleAddRowAfter = useCallback((itemId: string) => {
    const targetIndex = items.findIndex(item => item.id === itemId);
    if (targetIndex === -1) return;

    setItems(currentItems => {
      const newItems = [...currentItems];
      const targetItem = newItems[targetIndex];
      
      // Calculate new start time based on the target item's end time
      let newStartTime = targetItem.endTime || '00:00:00';
      
      // Create new row
      const newRow = {
        id: crypto.randomUUID(),
        type: 'regular' as const,
        rowNumber: '',
        name: '',
        startTime: newStartTime,
        duration: '00:00',
        endTime: calculateEndTime(newStartTime, '00:00'),
        elapsedTime: '00:00:00',
        talent: '',
        script: '',
        gfx: '',
        video: '',
        notes: '',
        color: '#ffffff',
        isFloating: false,
        customFields: {}
      };

      // Insert after the target item
      newItems.splice(targetIndex + 1, 0, newRow);
      return newItems;
    });
    
    markAsChanged();
  }, [items, setItems, calculateEndTime, markAsChanged]);

  const handleAddHeaderAfter = useCallback((itemId: string) => {
    const targetIndex = items.findIndex(item => item.id === itemId);
    if (targetIndex === -1) return;

    setItems(currentItems => {
      const newItems = [...currentItems];
      
      // Create new header
      const newHeader = {
        id: crypto.randomUUID(),
        type: 'header' as const,
        rowNumber: '',
        name: 'New Header',
        startTime: '00:00:00',
        duration: '00:00:00',
        endTime: '00:00:00',
        elapsedTime: '00:00:00',
        talent: '',
        script: '',
        gfx: '',
        video: '',
        notes: '',
        color: '#ffffff',
        isFloating: false,
        customFields: {}
      };

      // Insert after the target item
      newItems.splice(targetIndex + 1, 0, newHeader);
      return newItems;
    });
    
    markAsChanged();
  }, [items, setItems, markAsChanged]);

  return {
    handleDeleteSelectedRows,
    addRow,
    addHeader,
    handleAddRowAfter,
    handleAddHeaderAfter
  };
};
