
import { useCallback } from 'react';

interface UseRundownRowOperationsProps {
  selectedRows: Set<string>;
  deleteMultipleRows: (ids: string[]) => void;
  clearSelection: () => void;
  addRow: (calculateEndTime: (startTime: string, duration: string) => string, selectedRowId?: string | null, selectedRows?: Set<string>) => void;
  addHeader: (selectedRowId?: string | null, selectedRows?: Set<string>) => void;
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
    const selectedIds = Array.from(selectedRows);
    if (selectedIds.length > 0) {
      deleteMultipleRows(selectedIds);
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection]);

  const handleAddRow = useCallback((selectedRowId?: string | null) => {
    // Pass both single selection and multi-selection information
    addRow(calculateEndTime, selectedRowId, selectedRows.size > 0 ? selectedRows : undefined);
  }, [addRow, calculateEndTime, selectedRows]);

  const handleAddHeader = useCallback((selectedRowId?: string | null) => {
    // Pass both single selection and multi-selection information
    addHeader(selectedRowId, selectedRows.size > 0 ? selectedRows : undefined);
  }, [addHeader, selectedRows]);

  return {
    handleDeleteSelectedRows,
    handleAddRow,
    handleAddHeader
  };
};
