
import { useCallback, useMemo, useRef } from 'react';
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownGridUI } from './useRundownGridUI';
import { useResizableColumns } from './useResizableColumns';
import { isHeaderItem } from '@/types/rundown';

export const useRundownStateCoordination = () => {
  const coreState = useRundownGridCore();
  
  // Stable refs to prevent infinite loops
  const stableUpdateItemRef = useRef(coreState.updateItem);
  const stableMarkAsChangedRef = useRef(coreState.markAsChanged);
  
  // Simple cellRefs storage
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  
  // Update refs when core functions change
  stableUpdateItemRef.current = coreState.updateItem;
  stableMarkAsChangedRef.current = coreState.markAsChanged;

  // Stable color selection function
  const handleColorSelection = useCallback((id: string, color: string) => {
    stableUpdateItemRef.current(id, 'color', color);
    stableMarkAsChangedRef.current();
  }, []);

  // Use resizable columns with width change handler
  const { getColumnWidth, updateColumnWidth } = useResizableColumns(
    coreState.columns, 
    coreState.handleUpdateColumnWidth
  );

  // Simple cell navigation function
  const handleCellNavigation = useCallback((itemId: string, field: string, key: string) => {
    console.log('Navigation key pressed:', key, 'from', itemId, field);
    
    if (key === 'Enter' || key === 'ArrowDown') {
      const currentIndex = coreState.items.findIndex(item => item.id === itemId);
      
      // Find the next non-header item
      let nextItemIndex = currentIndex + 1;
      while (nextItemIndex < coreState.items.length && isHeaderItem(coreState.items[nextItemIndex])) {
        nextItemIndex++;
      }
      
      if (nextItemIndex < coreState.items.length) {
        const nextItemId = coreState.items[nextItemIndex].id;
        const targetCellKey = `${nextItemId}-${field}`;
        const targetCell = cellRefs.current[targetCellKey];
        
        console.log('Trying to focus next cell:', targetCellKey);
        if (targetCell) {
          console.log('Navigation successful to:', targetCellKey);
          targetCell.focus();
        } else {
          console.log('Cell not found in refs:', targetCellKey);
          console.log('Available refs:', Object.keys(cellRefs.current));
        }
      }
    } else if (key === 'ArrowUp') {
      const currentItemIndex = coreState.items.findIndex(item => item.id === itemId);
      
      // Find the previous non-header item
      let prevItemIndex = currentItemIndex - 1;
      while (prevItemIndex >= 0 && isHeaderItem(coreState.items[prevItemIndex])) {
        prevItemIndex--;
      }
      
      if (prevItemIndex >= 0) {
        const prevItem = coreState.items[prevItemIndex];
        const targetCellKey = `${prevItem.id}-${field}`;
        const targetCell = cellRefs.current[targetCellKey];
        
        console.log('Trying to focus previous cell:', targetCellKey);
        if (targetCell) {
          console.log('Navigation successful to:', targetCellKey);
          targetCell.focus();
        } else {
          console.log('Cell not found in refs:', targetCellKey);
          console.log('Available refs:', Object.keys(cellRefs.current));
        }
      }
    }
  }, [coreState.items]);

  // Simple cell click handler
  const handleCellClick = useCallback((itemId: string, field: string) => {
    // Just log for now, can be expanded if needed
    console.log('Cell clicked:', itemId, field);
  }, []);

  // Get interaction handlers
  const interactions = useRundownGridInteractions(
    coreState.items,
    coreState.setItems,
    coreState.updateItem,
    coreState.addRow,
    coreState.addHeader,
    coreState.deleteRow,
    coreState.toggleFloatRow,
    coreState.deleteMultipleRows,
    coreState.addMultipleRows,
    coreState.handleDeleteColumn,
    coreState.calculateEndTime,
    handleColorSelection,
    coreState.markAsChanged,
    coreState.setRundownTitle
  );

  // Get UI state
  const uiState = useRundownGridUI(
    coreState.items,
    coreState.visibleColumns,
    coreState.columns,
    coreState.updateItem,
    coreState.currentSegmentId,
    coreState.currentTime,
    coreState.markAsChanged
  );

  // Override the UI state's selectColor with our stable version and add navigation
  const stableUIState = useMemo(() => ({
    ...uiState,
    selectColor: handleColorSelection,
    getColumnWidth,
    updateColumnWidth,
    handleCellClick,
    handleKeyDown: handleCellNavigation,
    cellRefs
  }), [uiState, handleColorSelection, getColumnWidth, updateColumnWidth, handleCellClick, handleCellNavigation]);

  return {
    coreState,
    interactions,
    uiState: stableUIState
  };
};
