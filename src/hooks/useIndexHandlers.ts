
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RundownItem } from './useRundownItems';

interface UseIndexHandlersProps {
  items: RundownItem[];
  selectedRows: Set<string>;
  rundownId?: string;
  addRow: (calculateEndTime: (startTime: string, duration: string) => string, selectedRowId?: string | null) => void;
  addHeader: (selectedRowId?: string | null) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  toggleRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, allItems: RundownItem[]) => void;
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
  const navigate = useNavigate();

  const handleRundownStartTimeChange = useCallback((startTime: string) => {
    setRundownStartTime(startTime);
    markAsChanged();
  }, [setRundownStartTime, markAsChanged]);

  const handleTimezoneChange = useCallback((timezone: string) => {
    setTimezone(timezone);
    markAsChanged();
  }, [setTimezone, markAsChanged]);

  const handleOpenTeleprompter = useCallback(() => {
    if (!rundownId) return;
    navigate(`/teleprompter/${rundownId}`);
  }, [navigate, rundownId]);

  // Fixed to match the expected signature: (itemId, index, isShiftClick, isCtrlClick)
  const handleRowSelect = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items);
  }, [toggleRowSelection, items]);

  const handleAddRow = useCallback(() => {
    const selectedRowsArray = Array.from(selectedRows);
    const selectedRowId = selectedRowsArray.length === 1 ? selectedRowsArray[0] : null;
    addRow(calculateEndTime, selectedRowId);
  }, [addRow, calculateEndTime, selectedRows]);

  const handleAddHeader = useCallback(() => {
    const selectedRowsArray = Array.from(selectedRows);
    const selectedRowId = selectedRowsArray.length === 1 ? selectedRowsArray[0] : null;
    addHeader(selectedRowId);
  }, [addHeader, selectedRows]);

  return {
    handleRundownStartTimeChange,
    handleTimezoneChange,
    handleOpenTeleprompter,
    handleRowSelect,
    handleAddRow,
    handleAddHeader
  };
};
