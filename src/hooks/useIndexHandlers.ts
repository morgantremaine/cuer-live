
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

interface UseIndexHandlersProps {
  items: RundownItem[];
  selectedRows: Set<string>;
  rundownId?: string;
  addRow: (calculateEndTime: any, insertAfterIndex?: number) => void;
  addHeader: (insertAfterIndex?: number) => void;
  calculateEndTime: (item: RundownItem, prevEndTime?: string) => string;
  toggleRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, allItems: any[]) => void;
  setRundownStartTime: (startTime: string) => void;
  setTimezone: (timezone: string) => void;
  markAsChanged: () => void;
}

export const useIndexHandlers = ({
  items,
  selectedRows,
  rundownId,
  addRow,
  addHeader,
  calculateEndTime,
  toggleRowSelection,
  setRundownStartTime,
  setTimezone,
  markAsChanged
}: UseIndexHandlersProps) => {
  
  const handleRundownStartTimeChange = useCallback((startTime: string) => {
    setRundownStartTime(startTime);
    markAsChanged();
  }, [setRundownStartTime, markAsChanged]);

  const handleTimezoneChange = useCallback((timezone: string) => {
    setTimezone(timezone);
    markAsChanged();
  }, [setTimezone, markAsChanged]);

  const handleOpenTeleprompter = useCallback(() => {
    if (rundownId) {
      window.open(`/teleprompter/${rundownId}`, '_blank');
    }
  }, [rundownId]);

  const handleRowSelect = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items);
  }, [toggleRowSelection, items]);

  // Fix the function signatures to match what's expected
  const handleAddRow = useCallback(() => {
    const selectedRowsArray = Array.from(selectedRows);
    const insertAfterIndex = selectedRowsArray.length > 0 ? 
      items.findIndex(item => item.id === selectedRowsArray[selectedRowsArray.length - 1]) : 
      items.length - 1;
    addRow(calculateEndTime, insertAfterIndex);
  }, [addRow, calculateEndTime, selectedRows, items]);

  const handleAddHeader = useCallback(() => {
    const selectedRowsArray = Array.from(selectedRows);
    const insertAfterIndex = selectedRowsArray.length > 0 ? 
      items.findIndex(item => item.id === selectedRowsArray[selectedRowsArray.length - 1]) : 
      items.length - 1;
    addHeader(insertAfterIndex);
  }, [addHeader, selectedRows, items]);

  return {
    handleRundownStartTimeChange,
    handleTimezoneChange,
    handleOpenTeleprompter,
    handleRowSelect,
    handleAddRow,
    handleAddHeader
  };
};
