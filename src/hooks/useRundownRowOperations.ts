
import { useCallback } from 'react';

interface UseRundownRowOperationsProps {
  selectedRows: Set<string>;
  deleteMultipleRows: (ids: string[]) => void;
  clearSelection: () => void;
  addRow: (calculateEndTime: (startTime: string, duration: string) => string, selectedRowId?: string | null, selectedRows?: Set<string>, count?: number) => void;
  addHeader: (selectedRowId?: string | null, selectedRows?: Set<string>) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  // OT system handlers (optional for backwards compatibility)
  operationHandlers?: {
    handleRowDelete?: (itemId: string) => void;
    handleRowInsert?: (insertIndex: number, newItem: any) => void;
  };
}

export const useRundownRowOperations = ({
  selectedRows,
  deleteMultipleRows,
  clearSelection,
  addRow,
  addHeader,
  calculateEndTime,
  operationHandlers
}: UseRundownRowOperationsProps) => {
  const handleDeleteSelectedRows = useCallback(() => {
    const selectedIds = Array.from(selectedRows);
    if (selectedIds.length > 0) {
      console.log('🗑️ DELETE OPERATION:', { 
        count: selectedIds.length, 
        hasOTHandlers: !!operationHandlers?.handleRowDelete 
      });
      
      if (operationHandlers?.handleRowDelete) {
        console.log('🚀 ROUTING DELETE THROUGH OT SYSTEM');
        selectedIds.forEach(id => operationHandlers.handleRowDelete!(id));
      } else {
        console.log('⚠️ USING LEGACY DELETE SYSTEM');
        deleteMultipleRows(selectedIds);
      }
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection, operationHandlers]);

  const handleAddRow = useCallback((selectedRowId?: string | null, count?: number) => {
    console.log('🟡 handleAddRow called with count:', count);
    // Pass both single selection and multi-selection information
    addRow(calculateEndTime, selectedRowId, selectedRows.size > 0 ? selectedRows : undefined, count);
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
