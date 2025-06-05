
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

interface UseRundownGridWrappedFunctionsProps {
  items: RundownItem[];
  columns: Column[];
  rundownTitle: string;
  saveState: (items: RundownItem[], columns: Column[], title: string, action: string) => void;
  addRow: () => void;
  addHeader: () => void;
  deleteRow: (id: string) => void;
  deleteMultipleRows: (ids: string[]) => void;
  addMultipleRows: (newItems: RundownItem[]) => void;
  toggleFloatRow: (id: string) => void;
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void;
  setRundownTitle: (title: string) => void;
}

export const useRundownGridWrappedFunctions = ({
  items,
  columns,
  rundownTitle,
  saveState,
  addRow,
  addHeader,
  deleteRow,
  deleteMultipleRows,
  addMultipleRows,
  toggleFloatRow,
  setItems,
  setRundownTitle
}: UseRundownGridWrappedFunctionsProps) => {
  
  const wrappedAddRow = useCallback((selectedRowId?: string | null, selectedRows?: Set<string>) => {
    saveState(items, columns, rundownTitle, 'Add Row');
    addRow();
  }, [addRow, saveState, items, columns, rundownTitle]);

  const wrappedAddHeader = useCallback((selectedRowId?: string | null, selectedRows?: Set<string>) => {
    saveState(items, columns, rundownTitle, 'Add Header');
    addHeader();
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
    addMultipleRows(newItems);
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
