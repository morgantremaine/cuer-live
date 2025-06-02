
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

interface UseRundownClipboardOperationsProps {
  items: RundownItem[];
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void;
  selectedRows: Set<string>;
  clearSelection: () => void;
  addMultipleRows: (items: RundownItem[], calculateEndTime: (startTime: string, duration: string) => string) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  markAsChanged: () => void;
  clipboardItems: RundownItem[];
  copyItems: (items: RundownItem[]) => void;
  hasClipboardData: boolean;
}

export const useRundownClipboardOperations = ({
  items,
  setItems,
  selectedRows,
  clearSelection,
  addMultipleRows,
  calculateEndTime,
  markAsChanged,
  clipboardItems,
  copyItems,
  hasClipboardData
}: UseRundownClipboardOperationsProps) => {
  const handleCopySelectedRows = useCallback(() => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    if (selectedItems.length > 0) {
      copyItems(selectedItems);
      clearSelection();
    }
  }, [items, selectedRows, copyItems, clearSelection]);

  const handlePasteRows = useCallback(() => {
    if (clipboardItems.length > 0) {
      const selectedIds = Array.from(selectedRows);
      let insertAfterIndex: number | undefined;
      
      if (selectedIds.length > 0) {
        const selectedIndices = selectedIds.map(id => 
          items.findIndex(item => item.id === id)
        ).filter(index => index !== -1);
        
        if (selectedIndices.length > 0) {
          insertAfterIndex = Math.max(...selectedIndices);
        }
      }

      const itemsToPaste = clipboardItems.map(item => ({
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      
      if (insertAfterIndex !== undefined) {
        setItems(prevItems => {
          const newItems = [...prevItems];
          newItems.splice(insertAfterIndex! + 1, 0, ...itemsToPaste);
          return newItems;
        });
      } else {
        addMultipleRows(itemsToPaste, calculateEndTime);
      }
      
      markAsChanged();
    }
  }, [clipboardItems, selectedRows, items, setItems, addMultipleRows, calculateEndTime, markAsChanged]);

  return {
    handleCopySelectedRows,
    handlePasteRows
  };
};
