
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
  // OT system handlers (optional for backwards compatibility)
  operationHandlers?: {
    handleRowCopy?: (sourceItemId: string, newItem: any, insertIndex: number) => void;
  };
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
  hasClipboardData,
  operationHandlers
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
      console.log('🔄 PASTE OPERATION: Starting', { 
        itemCount: clipboardItems.length, 
        targetRowId,
        hasOTHandlers: !!operationHandlers?.handleRowCopy 
      });
      
      let insertIndex: number;
      
      if (targetRowId) {
        // Find the target row and insert after it
        const targetIndex = items.findIndex(item => item.id === targetRowId);
        if (targetIndex !== -1) {
          insertIndex = targetIndex + 1;
        } else {
          insertIndex = items.length;
        }
      } else {
        // Fallback to selected rows logic if no target specified
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

      // Use OT system if available
      if (operationHandlers?.handleRowCopy) {
        console.log('🚀 ROUTING PASTE THROUGH OT SYSTEM');
        clipboardItems.forEach((item, index) => {
          const newItem = {
            ...item,
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          operationHandlers.handleRowCopy!(item.id, newItem, insertIndex + index);
        });
      } else {
        // Fallback to old system
        console.log('⚠️ USING LEGACY PASTE SYSTEM');
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
      }
      
      // Clear selection after successful paste
      setTimeout(() => clearSelection(), 0);
    }
  }, [clipboardItems, selectedRows, items, setItems, markAsChanged, clearSelection, operationHandlers]);

  return {
    handleCopySelectedRows,
    handlePasteRows
  };
};
