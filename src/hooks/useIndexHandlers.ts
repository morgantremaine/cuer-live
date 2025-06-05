
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

interface UseIndexHandlersProps {
  items: RundownItem[];
  selectedRows: Set<string>;
  rundownId: string;
  addRow: (selectedRowId?: string | null, selectedRows?: Set<string>) => void;
  addHeader: (selectedRowId?: string | null, selectedRows?: Set<string>) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  toggleRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, items: RundownItem[]) => void;
  setRundownStartTime: (time: string) => void;
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
  const handleRundownStartTimeChange = useCallback((time: string) => {
    setRundownStartTime(time);
    markAsChanged();
  }, [setRundownStartTime, markAsChanged]);

  const handleTimezoneChange = useCallback((timezone: string) => {
    setTimezone(timezone);
    markAsChanged();
  }, [setTimezone, markAsChanged]);

  const handleOpenTeleprompter = useCallback(() => {
    const teleprompterUrl = `/teleprompter?rundownId=${rundownId}`;
    window.open(teleprompterUrl, '_blank');
  }, [rundownId]);

  const handleRowSelect = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items);
  }, [toggleRowSelection, items]);

  // Simple handlers that match what RundownIndexContent expects
  const handleAddRow = useCallback(() => {
    const selectedRowsArray = Array.from(selectedRows);
    const selectedRowId = selectedRowsArray.length === 1 ? selectedRowsArray[0] : null;
    const selectedRowsSet = selectedRows.size > 0 ? selectedRows : undefined;
    addRow(selectedRowId, selectedRowsSet);
    markAsChanged();
  }, [addRow, selectedRows, markAsChanged]);

  const handleAddHeader = useCallback(() => {
    const selectedRowsArray = Array.from(selectedRows);
    const selectedRowId = selectedRowsArray.length === 1 ? selectedRowsArray[0] : null;
    const selectedRowsSet = selectedRows.size > 0 ? selectedRows : undefined;
    addHeader(selectedRowId, selectedRowsSet);
    markAsChanged();
  }, [addHeader, selectedRows, markAsChanged]);

  return {
    handleRundownStartTimeChange,
    handleTimezoneChange,
    handleOpenTeleprompter,
    handleRowSelect,
    handleAddRow,
    handleAddHeader
  };
};
