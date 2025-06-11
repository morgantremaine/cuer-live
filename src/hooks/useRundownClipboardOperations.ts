
import { useCallback } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

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

// Helper function to generate segment names (A, B, C, etc.)
const generateSegmentName = (index: number): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < alphabet.length) {
    return alphabet[index];
  }
  // For indices beyond Z, use AA, AB, AC, etc.
  const firstLetter = Math.floor(index / alphabet.length) - 1;
  const secondLetter = index % alphabet.length;
  return alphabet[firstLetter] + alphabet[secondLetter];
};

// Helper function to update all header segment names based on their position
const updateHeaderSegmentNames = (items: RundownItem[]): RundownItem[] => {
  let headerIndex = 0;
  return items.map(item => {
    if (isHeaderItem(item)) {
      const updatedItem = {
        ...item,
        segmentName: generateSegmentName(headerIndex)
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
      clearSelection();
    }
  }, [items, selectedRows, copyItems, clearSelection]);

  const handlePasteRows = useCallback(() => {
    if (clipboardItems.length > 0) {
      console.log('Pasting items, selectedRows:', Array.from(selectedRows));
      console.log('Current items length:', items.length);
      
      const selectedIds = Array.from(selectedRows);
      let insertIndex: number;
      
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
        
        // Update header segment names for all headers in the correct order
        return updateHeaderSegmentNames(newItems);
      });
      
      markAsChanged();
      clearSelection();
    }
  }, [clipboardItems, selectedRows, items, setItems, markAsChanged, clearSelection]);

  return {
    handleCopySelectedRows,
    handlePasteRows
  };
};
