
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { RundownItem } from '@/types/rundown';

interface UseIndexHandlersProps {
  items: RundownItem[];
  selectedRows: Set<string>;
  rundownId?: string;
  addRow: (calculateEndTime: (startTime: string, duration: string) => string, insertAfterIndex?: number) => void;
  addHeader: (insertAfterIndex?: number) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  toggleRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, items: RundownItem[]) => void;
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
  const { toast } = useToast();

  const handleRundownStartTimeChange = useCallback((startTime: string) => {
    setRundownStartTime(startTime);
    markAsChanged();
  }, [setRundownStartTime, markAsChanged]);

  const handleTimezoneChange = useCallback((newTimezone: string) => {
    setTimezone(newTimezone);
    markAsChanged();
  }, [setTimezone, markAsChanged]);

  const handleOpenTeleprompter = useCallback(() => {
    if (!rundownId) {
      toast({
        title: "Cannot open teleprompter",
        description: "Save this rundown first to access the teleprompter.",
        variant: "destructive"
      });
      return;
    }

    const teleprompterUrl = `${window.location.origin}/teleprompter/${rundownId}`;
    window.open(teleprompterUrl, '_blank', 'width=1200,height=800');
  }, [rundownId, toast]);

  const handleRowSelect = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items);
  }, [toggleRowSelection, items]);

  const handleAddRow = useCallback(() => {
    const selectedRowsArray = Array.from(selectedRows);
    
    // If there's a single selected row, insert after it
    if (selectedRowsArray.length === 1) {
      const selectedItemId = selectedRowsArray[0];
      const selectedIndex = items.findIndex(item => item.id === selectedItemId);
      if (selectedIndex !== -1) {
        addRow(calculateEndTime, selectedIndex);
        return;
      }
    }
    // Default behavior: add to the end
    addRow(calculateEndTime);
  }, [selectedRows, items, addRow, calculateEndTime]);

  const handleAddHeader = useCallback(() => {
    const selectedRowsArray = Array.from(selectedRows);
    
    // If there's a single selected row, insert after it
    if (selectedRowsArray.length === 1) {
      const selectedItemId = selectedRowsArray[0];
      const selectedIndex = items.findIndex(item => item.id === selectedItemId);
      if (selectedIndex !== -1) {
        addHeader(selectedIndex);
        return;
      }
    }
    // Default behavior: add to the end
    addHeader();
  }, [selectedRows, items, addHeader]);

  return {
    handleRundownStartTimeChange,
    handleTimezoneChange,
    handleOpenTeleprompter,
    handleRowSelect,
    handleAddRow,
    handleAddHeader
  };
};
