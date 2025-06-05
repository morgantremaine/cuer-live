
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RundownItem } from '@/types/rundown';

interface UseIndexHandlersProps {
  items: RundownItem[];
  selectedRows: Set<string>;
  rundownId?: string;
  addRow: (calculateEndTime: any, insertAfterIndex?: number) => void;
  addHeader: (insertAfterIndex?: number) => void;
  calculateEndTime: any;
  toggleRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
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

  const handleRowSelect = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick);
  }, [toggleRowSelection]);

  const handleAddRow = useCallback(() => {
    // Use the interface that expects insertAfterIndex
    addRow(calculateEndTime);
  }, [addRow, calculateEndTime]);

  const handleAddHeader = useCallback(() => {
    // Use the interface that expects insertAfterIndex
    addHeader();
  }, [addHeader]);

  return {
    handleRundownStartTimeChange,
    handleTimezoneChange,
    handleOpenTeleprompter,
    handleRowSelect,
    handleAddRow,
    handleAddHeader
  };
};
