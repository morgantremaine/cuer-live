
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
    console.log('🔄 Copy operation started');
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    console.log('📋 Items to copy:', selectedItems.length);
    if (selectedItems.length > 0) {
      copyItems(selectedItems);
      clearSelection();
      console.log('✅ Copy completed');
    }
  }, [items, selectedRows, copyItems, clearSelection]);

  const handlePasteRows = useCallback(() => {
    console.log('🔄 Paste operation started');
    console.log('📋 Clipboard items available:', clipboardItems.length);
    console.log('🎯 Selected rows:', Array.from(selectedRows));
    console.log('📊 Current items count:', items.length);
    
    if (clipboardItems.length > 0) {
      const selectedIds = Array.from(selectedRows);
      let insertIndex: number;
      
      if (selectedIds.length > 0) {
        console.log('🎯 Finding insertion point for selected rows...');
        // Find the indices of all selected rows
        const selectedIndices = selectedIds
          .map(id => {
            const index = items.findIndex(item => item.id === id);
            console.log(`📍 Item ${id} found at index ${index}`);
            return index;
          })
          .filter(index => index !== -1);
        
        if (selectedIndices.length > 0) {
          // Insert after the last selected item
          const highestSelectedIndex = Math.max(...selectedIndices);
          insertIndex = highestSelectedIndex + 1;
          console.log(`✅ Will insert at index ${insertIndex} (after row ${highestSelectedIndex})`);
        } else {
          // If no valid selection found, insert at the end
          insertIndex = items.length;
          console.log(`⚠️ No valid selection found, inserting at end: ${insertIndex}`);
        }
      } else {
        // If no selection, insert at the end
        insertIndex = items.length;
        console.log(`📌 No selection, inserting at end: ${insertIndex}`);
      }

      const itemsToPaste = clipboardItems.map(item => ({
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      
      console.log(`🔄 About to insert ${itemsToPaste.length} items at index ${insertIndex}`);
      
      setItems(prevItems => {
        const newItems = [...prevItems];
        // Insert at the calculated position
        newItems.splice(insertIndex, 0, ...itemsToPaste);
        
        console.log(`✅ Items inserted. New total: ${newItems.length}`);
        
        // Update header segment names for all headers in the correct order
        return updateHeaderSegmentNames(newItems);
      });
      
      markAsChanged();
      clearSelection();
      console.log('✅ Paste operation completed');
    } else {
      console.log('⚠️ No clipboard items to paste');
    }
  }, [clipboardItems, selectedRows, items, setItems, markAsChanged, clearSelection]);

  return {
    handleCopySelectedRows,
    handlePasteRows
  };
};
