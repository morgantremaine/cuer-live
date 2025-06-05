
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

interface UseRundownWrappedOperationsProps {
  items: RundownItem[];
  columns: Column[];
  rundownTitle: string;
  saveState: (items: RundownItem[], columns: Column[], title: string, action: string) => void;
  addRow: (calculateEndTime: any, insertAfterIndex?: number) => void;
  addHeader: (insertAfterIndex?: number) => void;
  deleteRow: (id: string) => void;
  deleteMultipleRows: (ids: string[]) => void;
  toggleFloatRow: (id: string) => void;
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void;
  addMultipleRows: (newItems: RundownItem[], calculateEndTime: any) => void;
  setRundownTitle: (title: string) => void;
}

export const useRundownWrappedOperations = ({
  items,
  columns,
  rundownTitle,
  saveState,
  addRow,
  addHeader,
  deleteRow,
  deleteMultipleRows,
  toggleFloatRow,
  setItems,
  addMultipleRows,
  setRundownTitle
}: UseRundownWrappedOperationsProps) => {
  
  const wrappedAddRow = useCallback((calculateEndTimeFn: any, selectedRows?: Set<string>) => {
    console.log('Wrapped operations: Adding row with selected rows:', selectedRows?.size || 0);
    saveState(items, columns, rundownTitle, 'Add Row');
    
    // Find the index of the last selected row if multiple rows are selected
    let insertAfterIndex: number | undefined = undefined;
    if (selectedRows && selectedRows.size > 0) {
      // Find the highest index among selected rows
      const selectedIndices = Array.from(selectedRows).map(id => 
        items.findIndex(item => item.id === id)
      ).filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        insertAfterIndex = Math.max(...selectedIndices);
        console.log('Wrapped operations: Inserting row after index:', insertAfterIndex);
      }
    }
    
    // Call addRow with the insertion index
    addRow(calculateEndTimeFn, insertAfterIndex);
  }, [addRow, saveState, items, columns, rundownTitle]);

  const wrappedAddHeader = useCallback((selectedRows?: Set<string>) => {
    console.log('Wrapped operations: Adding header with selected rows:', selectedRows?.size || 0);
    saveState(items, columns, rundownTitle, 'Add Header');
    
    // Find the index of the last selected row if multiple rows are selected
    let insertAfterIndex: number | undefined = undefined;
    if (selectedRows && selectedRows.size > 0) {
      // Find the highest index among selected rows
      const selectedIndices = Array.from(selectedRows).map(id => 
        items.findIndex(item => item.id === id)
      ).filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        insertAfterIndex = Math.max(...selectedIndices);
        console.log('Wrapped operations: Inserting header after index:', insertAfterIndex);
      }
    }
    
    // Call addHeader with the insertion index
    addHeader(insertAfterIndex);
  }, [addHeader, saveState, items, columns, rundownTitle]);

  const wrappedDeleteRow = useCallback((id: string) => {
    saveState(items, columns, rundownTitle, 'Delete Row');
    deleteRow(id);
  }, [deleteRow, saveState, items, columns, rundownTitle]);

  const wrappedDeleteMultipleRows = useCallback((ids: string[]) => {
    saveState(items, columns, rundownTitle, 'Delete Multiple Rows');
    deleteMultipleRows(ids);
  }, [deleteMultipleRows, saveState, items, columns, rundownTitle]);

  const wrappedToggleFloatRow = useCallback((id: string) => {
    saveState(items, columns, rundownTitle, 'Toggle Float');
    toggleFloatRow(id);
  }, [toggleFloatRow, saveState, items, columns, rundownTitle]);

  const wrappedSetItems = useCallback((updater: (prev: RundownItem[]) => RundownItem[]) => {
    const newItems = typeof updater === 'function' ? updater(items) : updater;
    // Only save state if items actually changed
    if (JSON.stringify(newItems) !== JSON.stringify(items)) {
      saveState(items, columns, rundownTitle, 'Move Rows');
    }
    setItems(updater);
  }, [setItems, saveState, items, columns, rundownTitle]);

  const wrappedAddMultipleRows = useCallback((newItems: RundownItem[], calculateEndTimeFn: any) => {
    saveState(items, columns, rundownTitle, 'Paste Rows');
    addMultipleRows(newItems, calculateEndTimeFn);
  }, [addMultipleRows, saveState, items, columns, rundownTitle]);

  const wrappedSetRundownTitle = useCallback((title: string) => {
    if (title !== rundownTitle) {
      saveState(items, columns, rundownTitle, 'Change Title');
    }
    setRundownTitle(title);
  }, [setRundownTitle, saveState, items, columns, rundownTitle]);

  return {
    wrappedAddRow,
    wrappedAddHeader,
    wrappedDeleteRow,
    wrappedDeleteMultipleRows,
    wrappedToggleFloatRow,
    wrappedSetItems,
    wrappedAddMultipleRows,
    wrappedSetRundownTitle
  };
};
