
import { useCallback } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { generateHeaderLabel } from '@/utils/headerUtils';

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
  // operationHandlers removed - all structural operations now go through state methods
}

// Helper function to update all header segment names based on their position
const updateHeaderSegmentNames = (items: RundownItem[]): RundownItem[] => {
  let headerIndex = 0;
  return items.map(item => {
    if (isHeaderItem(item)) {
      const updatedItem = {
        ...item,
        segmentName: generateHeaderLabel(headerIndex)
      };
      headerIndex++;
      return updatedItem;
    }
    return item;
  });
};

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
  // operationHandlers removed - all structural operations now go through state methods
}: UseRundownClipboardOperationsProps) => {
  const handleCopySelectedRows = useCallback(() => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    if (selectedItems.length > 0) {
      copyItems(selectedItems);
      // Clear selection immediately after copy
      setTimeout(() => clearSelection(), 0);
    }
  }, [items, selectedRows, copyItems, clearSelection]);

  const handlePasteRows = useCallback((targetRowId?: string) => {
    if (clipboardItems.length > 0) {
      console.log('🔄 PASTE OPERATION: Using structural save system', { 
        itemCount: clipboardItems.length, 
        targetRowId
      });
      
      let insertIndex: number;
      
      if (targetRowId) {
        const targetIndex = items.findIndex(item => item.id === targetRowId);
        insertIndex = targetIndex !== -1 ? targetIndex + 1 : items.length;
      } else {
        const selectedIds = Array.from(selectedRows);
        
        if (selectedIds.length > 0) {
          const selectedIndices = selectedIds
            .map(id => items.findIndex(item => item.id === id))
            .filter(index => index !== -1);
          
          if (selectedIndices.length > 0) {
            const highestSelectedIndex = Math.max(...selectedIndices);
            insertIndex = highestSelectedIndex + 1;
          } else {
            insertIndex = items.length;
          }
        } else {
          insertIndex = items.length;
        }
      }

      // Route through state method - paste items
      const itemsToPaste = clipboardItems.map(item => ({
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      
      setItems(prevItems => {
        const newItems = [...prevItems];
        newItems.splice(insertIndex, 0, ...itemsToPaste);
        return updateHeaderSegmentNames(newItems);
      });
      
      markAsChanged();
      
      setTimeout(() => clearSelection(), 0);
    }
  }, [clipboardItems, selectedRows, items, setItems, markAsChanged, clearSelection]);

  return {
    handleCopySelectedRows,
    handlePasteRows
  };
};
