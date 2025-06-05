
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RundownItem } from '@/types/rundown';

interface UseIndexHandlersProps {
  items: RundownItem[];
  selectedRows: Set<string>;
  rundownId: string | undefined;
  addRow: (insertAfterIndex?: number) => void;
  addHeader: (insertAfterIndex?: number) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  toggleRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, allItems: RundownItem[]) => void;
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
      window.open(`/teleprompter/${rundownId}`, '_blank');
    }
  }, [rundownId]);

  const handleRowSelect = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items);
  }, [toggleRowSelection, items]);

  // Standardized handlers that use insertAfterIndex
  const handleAddRow = useCallback(() => {
    let insertAfterIndex: number | undefined = undefined;
    
    if (selectedRows.size > 0) {
      // Find the highest index among selected rows
      const selectedIndices = Array.from(selectedRows).map(id => 
        items.findIndex(item => item.id === id)
      ).filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        insertAfterIndex = Math.max(...selectedIndices);
      }
    }
    
    addRow(insertAfterIndex);
  }, [addRow, items, selectedRows]);

  const handleAddHeader = useCallback(() => {
    let insertAfterIndex: number | undefined = undefined;
    
    if (selectedRows.size > 0) {
      // Find the highest index among selected rows
      const selectedIndices = Array.from(selectedRows).map(id => 
        items.findIndex(item => item.id === id)
      ).filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        insertAfterIndex = Math.max(...selectedIndices);
      }
    }
    
    addHeader(insertAfterIndex);
  }, [addHeader, items, selectedRows]);

  return {
    handleRundownStartTimeChange,
    handleTimezoneChange,
    handleOpenTeleprompter,
    handleRowSelect,
    handleAddRow,
    handleAddHeader
  };
};
