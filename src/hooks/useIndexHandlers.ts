
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
  toggleRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, allItems: RundownItem[], headerGroupItemIds?: string[]) => void;
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

  const handleRundownStartTimeChange = useCallback((isoDateTime: string) => {
    // Extract time portion only (HH:MM:SS) for rundown timing
    console.log('🕒 handleRundownStartTimeChange called with:', isoDateTime);
    
    // Store the full ISO in localStorage for date persistence
    if (rundownId) {
      localStorage.setItem(`rundown-datetime-${rundownId}`, isoDateTime);
    }
    
    // Extract and set only the time portion for rundown start time
    const timeOnly = new Date(isoDateTime).toTimeString().slice(0, 8); // HH:MM:SS
    console.log('🕒 useSimplifiedRundownState setStartTime called with:', timeOnly, 'current:', timeOnly);
    setRundownStartTime(timeOnly);
    markAsChanged();
  }, [setRundownStartTime, markAsChanged, rundownId]);

  const handleTimezoneChange = useCallback((timezone: string) => {
    setTimezone(timezone);
    markAsChanged();
  }, [setTimezone, markAsChanged]);

  const handleOpenTeleprompter = useCallback(() => {
    if (!rundownId) return;
    navigate(`/rundown/${rundownId}/teleprompter`);
  }, [navigate, rundownId]);

  const handleRowSelect = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items, headerGroupItemIds);
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
