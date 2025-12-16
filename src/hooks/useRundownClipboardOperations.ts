
import { useCallback } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { generateHeaderLabel } from '@/utils/headerUtils';
import { compareSortOrder } from '@/utils/fractionalIndex';

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
      console.log('Pasting items, targetRowId:', targetRowId);
      console.log('Current items length:', items.length);
      
      let insertIndex: number;
      
      if (targetRowId) {
        // Find the target row and insert after it
        const targetIndex = items.findIndex(item => item.id === targetRowId);
        if (targetIndex !== -1) {
          insertIndex = targetIndex + 1;
          console.log('Inserting at index:', insertIndex, 'after target row:', targetRowId);
        } else {
          // If target not found, insert at the end
          insertIndex = items.length;
          console.log('Target row not found, inserting at end:', insertIndex);
        }
      } else {
        // Fallback to selected rows logic if no target specified
        const selectedIds = Array.from(selectedRows);
        
        if (selectedIds.length > 0) {
          // Find the indices of all selected rows
          const selectedIndices = selectedIds
            .map(id => {
              const index = items.findIndex(item => item.id === id);
              console.log(`Found item ${id} at index ${index}`);
              return index;
            })
            .filter(index => index !== -1);
          
          if (selectedIndices.length > 0) {
            // Insert after the last selected item
            const highestSelectedIndex = Math.max(...selectedIndices);
            insertIndex = highestSelectedIndex + 1;
            console.log('Inserting at index:', insertIndex, 'after selected index:', highestSelectedIndex);
          } else {
            // If no valid selection found, insert at the end
            insertIndex = items.length;
            console.log('No valid selection, inserting at end:', insertIndex);
          }
        } else {
          // If no selection, insert at the end
          insertIndex = items.length;
          console.log('No selection, inserting at end:', insertIndex);
        }
      }

      const itemsToPaste = clipboardItems.map(item => ({
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      
      console.log('About to insert', itemsToPaste.length, 'items at index:', insertIndex);
      
      setItems(prevItems => {
        const newItems = [...prevItems];
        // Insert at the calculated position
        newItems.splice(insertIndex, 0, ...itemsToPaste);
        
        console.log('New items length after insert:', newItems.length);
        
        // CRITICAL: Sort by sortOrder to ensure consistent display order
        newItems.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
        
        // Update header segment names for all headers in the correct order
        return updateHeaderSegmentNames(newItems);
      });
      
      markAsChanged();
      // Clear selection after successful paste
      setTimeout(() => clearSelection(), 0);
    }
  }, [clipboardItems, selectedRows, items, setItems, markAsChanged, clearSelection]);

  return {
    handleCopySelectedRows,
    handlePasteRows
  };
};
