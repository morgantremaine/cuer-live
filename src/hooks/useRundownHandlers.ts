
import { useCallback } from 'react';
import { RundownItem } from './useRundownItems';

interface UseRundownHandlersProps {
  updateItem: (id: string, field: string, value: string) => void;
  addRow: (calculateEndTime: (startTime: string, duration: string) => string) => void;
  addHeader: () => void;
  deleteRow: (id: string) => void;
  toggleFloatRow: (id: string) => void;
  deleteMultipleRows: (ids: string[]) => void;
  addMultipleRows: (items: RundownItem[], calculateEndTime: (startTime: string, duration: string) => string) => void;
  handleDeleteColumn: (columnId: string) => void;
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  selectColor: (id: string, color: string, updateItem: (id: string, field: string, value: string) => void) => void;
  markAsChanged: () => void;
}

export const useRundownHandlers = ({
  updateItem,
  addRow,
  addHeader,
  deleteRow,
  toggleFloatRow,
  deleteMultipleRows,
  addMultipleRows,
  handleDeleteColumn,
  setItems,
  calculateEndTime,
  selectColor,
  markAsChanged
}: UseRundownHandlersProps) => {
  const handleUpdateItem = useCallback((id: string, field: string, value: string) => {
    updateItem(id, field, value);
    markAsChanged();
  }, [updateItem, markAsChanged]);

  const handleAddRow = useCallback(() => {
    addRow(calculateEndTime);
    markAsChanged();
  }, [addRow, calculateEndTime, markAsChanged]);

  const handleAddHeader = useCallback(() => {
    addHeader();
    markAsChanged();
  }, [addHeader, markAsChanged]);

  const handleDeleteRow = useCallback((id: string) => {
    deleteRow(id);
    markAsChanged();
  }, [deleteRow, markAsChanged]);

  const handleToggleFloat = useCallback((id: string) => {
    toggleFloatRow(id);
    markAsChanged();
  }, [toggleFloatRow, markAsChanged]);

  const handleColorSelect = useCallback((id: string, color: string) => {
    selectColor(id, color, updateItem);
    markAsChanged();
  }, [selectColor, updateItem, markAsChanged]);

  const handleDeleteSelectedRows = useCallback((selectedRows: Set<string>, clearSelection: () => void) => {
    deleteMultipleRows(Array.from(selectedRows));
    clearSelection();
    markAsChanged();
  }, [deleteMultipleRows, markAsChanged]);

  const handlePasteRows = useCallback((clipboardItems: RundownItem[], hasClipboardData: () => boolean, selectedRows: Set<string>) => {
    if (!hasClipboardData() || clipboardItems.length === 0) {
      return;
    }

    setItems(prevItems => {
      // If no rows are selected, add to the end
      if (selectedRows.size === 0) {
        const lastItem = prevItems[prevItems.length - 1];
        let insertStartTime = lastItem ? calculateEndTime(lastItem.startTime, lastItem.duration) : '00:00:00';
        
        const newItems = clipboardItems.map((clipItem, index) => {
          const newId = `copy_${Date.now()}_${index}`;
          const startTime = index === 0 ? insertStartTime : calculateEndTime(insertStartTime, clipboardItems[index - 1].duration);
          const endTime = calculateEndTime(startTime, clipItem.duration);
          
          if (index > 0) {
            insertStartTime = endTime;
          }
          
          return {
            ...clipItem,
            id: newId,
            startTime,
            endTime,
            customFields: clipItem.customFields || {}
          };
        });
        
        return [...prevItems, ...newItems];
      }

      // Find the last selected row's index
      const selectedIndices = Array.from(selectedRows)
        .map(id => prevItems.findIndex(item => item.id === id))
        .filter(index => index !== -1)
        .sort((a, b) => b - a); // Sort descending to get the last selected index
      
      const insertIndex = selectedIndices[0] + 1; // Insert after the last selected row
      
      // Calculate start time for the first pasted item
      const referenceItem = prevItems[insertIndex - 1];
      let insertStartTime = referenceItem ? calculateEndTime(referenceItem.startTime, referenceItem.duration) : '00:00:00';
      
      // Create new items with proper timing
      const newItems = clipboardItems.map((clipItem, index) => {
        const newId = `copy_${Date.now()}_${index}`;
        const startTime = index === 0 ? insertStartTime : calculateEndTime(insertStartTime, clipboardItems[index - 1].duration);
        const endTime = calculateEndTime(startTime, clipItem.duration);
        
        if (index > 0) {
          insertStartTime = endTime;
        }
        
        return {
          ...clipItem,
          id: newId,
          startTime,
          endTime,
          customFields: clipItem.customFields || {}
        };
      });
      
      // Insert the new items at the correct position
      const newItemsList = [
        ...prevItems.slice(0, insertIndex),
        ...newItems,
        ...prevItems.slice(insertIndex)
      ];
      
      // Update start/end times for items after the inserted ones
      const itemsToUpdate = newItemsList.slice(insertIndex + newItems.length);
      let currentTime = newItems[newItems.length - 1].endTime;
      
      itemsToUpdate.forEach((item, index) => {
        const updatedStartTime = currentTime;
        const updatedEndTime = calculateEndTime(updatedStartTime, item.duration);
        newItemsList[insertIndex + newItems.length + index] = {
          ...item,
          startTime: updatedStartTime,
          endTime: updatedEndTime
        };
        currentTime = updatedEndTime;
      });
      
      return newItemsList;
    });
    
    markAsChanged();
  }, [setItems, calculateEndTime, markAsChanged]);

  const handleDeleteColumnWithCleanup = useCallback((columnId: string) => {
    handleDeleteColumn(columnId);
    setItems(prev => prev.map(item => {
      if (item.customFields) {
        const { [columnId]: removed, ...rest } = item.customFields;
        return { ...item, customFields: rest };
      }
      return item;
    }));
    markAsChanged();
  }, [handleDeleteColumn, setItems, markAsChanged]);

  return {
    handleUpdateItem,
    handleAddRow,
    handleAddHeader,
    handleDeleteRow,
    handleToggleFloat,
    handleColorSelect,
    handleDeleteSelectedRows,
    handlePasteRows,
    handleDeleteColumnWithCleanup
  };
};
