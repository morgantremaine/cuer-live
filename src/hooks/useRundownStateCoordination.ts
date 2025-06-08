
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
  const stableItemsRef = useRef(coreState.items);
  
  // Simple cellRefs storage with stable reference
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  
  // Update refs when core functions change
  stableUpdateItemRef.current = coreState.updateItem;
  stableMarkAsChangedRef.current = coreState.markAsChanged;
  stableItemsRef.current = coreState.items;

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

  // Simple cell navigation function with correct signature and stable items ref
  const handleCellNavigation = useCallback((e: React.KeyboardEvent, itemId: string, field: string) => {
    const key = e.key;
    console.log('Navigation key pressed:', key, 'from', itemId, field);
    
    if (key === 'Enter' || key === 'ArrowDown') {
      const currentIndex = stableItemsRef.current.findIndex(item => item.id === itemId);
      
      // Find the next non-header item
      let nextItemIndex = currentIndex + 1;
      while (nextItemIndex < stableItemsRef.current.length && isHeaderItem(stableItemsRef.current[nextItemIndex])) {
        nextItemIndex++;
      }
      
      if (nextItemIndex < stableItemsRef.current.length) {
        const nextItemId = stableItemsRef.current[nextItemIndex].id;
        const targetCellKey = `${nextItemId}-${field}`;
        
        // Add a small delay to ensure refs are available after re-render
        setTimeout(() => {
          const targetCell = cellRefs.current[targetCellKey];
          console.log('Trying to focus next cell:', targetCellKey);
          console.log('Available refs:', Object.keys(cellRefs.current));
          
          if (targetCell) {
            console.log('Navigation successful to:', targetCellKey);
            targetCell.focus();
          } else {
            console.log('Cell not found in refs:', targetCellKey);
          }
        }, 50); // Increased delay to 50ms
      }
    } else if (key === 'ArrowUp') {
      const currentItemIndex = stableItemsRef.current.findIndex(item => item.id === itemId);
      
      // Find the previous non-header item
      let prevItemIndex = currentItemIndex - 1;
      while (prevItemIndex >= 0 && isHeaderItem(stableItemsRef.current[prevItemIndex])) {
        prevItemIndex--;
      }
      
      if (prevItemIndex >= 0) {
        const prevItem = stableItemsRef.current[prevItemIndex];
        const targetCellKey = `${prevItem.id}-${field}`;
        
        // Add a small delay to ensure refs are available after re-render
        setTimeout(() => {
          const targetCell = cellRefs.current[targetCellKey];
          console.log('Trying to focus previous cell:', targetCellKey);
          console.log('Available refs:', Object.keys(cellRefs.current));
          
          if (targetCell) {
            console.log('Navigation successful to:', targetCellKey);
            targetCell.focus();
          } else {
            console.log('Cell not found in refs:', targetCellKey);
          }
        }, 50); // Increased delay to 50ms
      }
    }
  }, []); // Empty dependency array since we use refs

  // Simple cell click handler - completely stable
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
