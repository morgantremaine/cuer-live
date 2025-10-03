
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RundownItem } from './useRundownItems';

interface UseIndexHandlersProps {
  items: RundownItem[];
  selectedRows: Set<string>;
  rundownId?: string;
  addRow: (calculateEndTime: (startTime: string, duration: string) => string, selectedRowId?: string | null, selectedRows?: Set<string>, count?: number) => void;
  addHeader: (selectedRowId?: string | null) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  toggleRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, allItems: RundownItem[], headerGroupItemIds?: string[]) => void;
  setRundownStartTime: (startTime: string) => void;
  setTimezone: (timezone: string) => void;
  setShowDate?: (showDate: Date | null) => void;
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
  setShowDate,
  markAsChanged
}: UseIndexHandlersProps) => {
  const navigate = useNavigate();

  const handleRundownStartTimeChange = useCallback((startTime: string) => {
    console.log('🕐 INDEX HANDLERS: Start time changed:', startTime);
    setRundownStartTime(startTime);
    // Don't call markAsChanged - let the state setter handle save coordination
  }, [setRundownStartTime]);

  const handleTimezoneChange = useCallback((timezone: string) => {
    console.log('🌍 INDEX HANDLERS: Timezone changed:', timezone);
    setTimezone(timezone);
    // Don't call markAsChanged - let the state setter handle save coordination
  }, [setTimezone]);

  const handleShowDateChange = useCallback((showDate: Date | null) => {
    console.log('📅 INDEX HANDLERS: Show date changed:', showDate);
    if (setShowDate) {
      setShowDate(showDate);
      // Don't call markAsChanged - let the state setter handle save coordination
    }
  }, [setShowDate]);

  const handleOpenTeleprompter = useCallback(() => {
    if (!rundownId) return;
    navigate(`/rundown/${rundownId}/teleprompter`);
  }, [navigate, rundownId]);

  const handleRowSelect = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items, headerGroupItemIds);
  }, [toggleRowSelection, items]);

  const handleAddRow = useCallback((count?: number) => {
    const selectedRowsArray = Array.from(selectedRows);
    const selectedRowId = selectedRowsArray.length === 1 ? selectedRowsArray[0] : null;
    addRow(calculateEndTime, selectedRowId, undefined, count);
  }, [addRow, calculateEndTime, selectedRows]);

  const handleAddHeader = useCallback(() => {
    const selectedRowsArray = Array.from(selectedRows);
    const selectedRowId = selectedRowsArray.length === 1 ? selectedRowsArray[0] : null;
    addHeader(selectedRowId);
  }, [addHeader, selectedRows]);

  return {
    handleRundownStartTimeChange,
    handleTimezoneChange,
    handleShowDateChange,
    handleOpenTeleprompter,
    handleRowSelect,
    handleAddRow,
    handleAddHeader
  };
};
