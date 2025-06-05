
import { useCallback } from 'react';

interface UseRundownRowOperationsProps {
  selectedRows: Set<string>;
  deleteMultipleRows: (ids: string[]) => void;
  clearSelection: () => void;
  addRow: (calculateEndTime: any, selectedRows?: Set<string>) => void;
  addHeader: (selectedRows?: Set<string>) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
}

export const useRundownRowOperations = ({
  selectedRows,
  deleteMultipleRows,
  clearSelection,
  addRow,
  addHeader,
  calculateEndTime
}: UseRundownRowOperationsProps) => {
  
  const handleDeleteSelectedRows = useCallback(() => {
    if (selectedRows.size > 0) {
      deleteMultipleRows(Array.from(selectedRows));
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection]);

  const handleAddRow = useCallback(() => {
    // Pass the selected rows to addRow so it can insert after the selection
    addRow(calculateEndTime, selectedRows);
  }, [addRow, calculateEndTime, selectedRows]);

  const handleAddHeader = useCallback(() => {
    // Pass the selected rows to addHeader so it can insert after the selection  
    addHeader(selectedRows);
  }, [addHeader, selectedRows]);

  return {
    handleDeleteSelectedRows,
    handleAddRow,
    handleAddHeader
  };
};
