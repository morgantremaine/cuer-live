
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RundownItem } from '@/types/rundown';

interface UseIndexHandlersProps {
  items: RundownItem[];
  selectedRows: Set<string>;
  rundownId?: string;
  addRow: (calculateEndTime: (startTime: string, duration: string) => string, selectedRowId?: string, selectedRows?: Set<string>) => void;
  addHeader: (selectedRowId?: string, selectedRows?: Set<string>) => void;
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
  const navigate = useNavigate();

  const handleRundownStartTimeChange = useCallback((time: string) => {
    setRundownStartTime(time);
    markAsChanged();
  }, [setRundownStartTime, markAsChanged]);

  const handleTimezoneChange = useCallback((timezone: string) => {
    setTimezone(timezone);
    markAsChanged();
  }, [setTimezone, markAsChanged]);

  const handleOpenTeleprompter = useCallback(() => {
    if (rundownId) {
      // Open teleprompter in new window/tab
      window.open(`/teleprompter/${rundownId}`, '_blank', 'noopener,noreferrer');
    } else {
      // For new rundowns, navigate to teleprompter with current data
      const teleprompterUrl = `/teleprompter?items=${encodeURIComponent(JSON.stringify(items))}`;
      window.open(teleprompterUrl, '_blank', 'noopener,noreferrer');
    }
  }, [rundownId, items]);

  const handleRowSelect = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items);
  }, [toggleRowSelection, items]);

  const handleAddRow = useCallback(() => {
    if (selectedRows.size > 0) {
      // Add after the last selected row
      addRow(calculateEndTime, undefined, selectedRows);
    } else {
      // Add at the end
      addRow(calculateEndTime);
    }
  }, [addRow, calculateEndTime, selectedRows]);

  const handleAddHeader = useCallback(() => {
    if (selectedRows.size > 0) {
      // Add after the last selected row
      addHeader(undefined, selectedRows);
    } else {
      // Add at the end
      addHeader();
    }
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
