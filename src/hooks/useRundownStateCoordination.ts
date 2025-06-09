
import { useMemo } from 'react';
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownGridUI } from './useRundownGridUI';
import { useTimeCalculations } from './useTimeCalculations';
import { useRundownCalculations } from './useRundownCalculations';

export const useRundownStateCoordination = () => {
  // Core rundown state and operations
  const basicState = useRundownBasicState();
  
  // Grid-specific core functionality - pass the basic state as integration props
  const gridCore = useRundownGridCore({
    markAsChanged: basicState.markAsChanged,
    rundownTitle: basicState.rundownTitle,
    timezone: basicState.timezone,
    rundownStartTime: basicState.rundownStartTime,
    setRundownTitleDirectly: basicState.setRundownTitleDirectly,
    setTimezoneDirectly: basicState.setTimezoneDirectly,
    setRundownStartTimeDirectly: basicState.setRundownStartTimeDirectly,
    setAutoSaveTrigger: basicState.setAutoSaveTrigger,
    isProcessingRealtimeUpdate: false
  });

  // Add the time calculations hook that was missing
  const { calculateEndTime, getRowStatus } = useTimeCalculations(
    gridCore.items, 
    gridCore.updateItem, 
    basicState.rundownStartTime || '09:00:00'
  );

  // Add the rundown calculations hook for row numbers and durations
  const { getRowNumber, calculateTotalRuntime, calculateHeaderDuration } = useRundownCalculations(gridCore.items);
  
  // Grid interactions (drag/drop, selection, clipboard)
  const gridInteractions = useRundownGridInteractions(
    gridCore.items,
    gridCore.setItems,
    gridCore.updateItem,
    gridCore.addRow,
    gridCore.addHeader,
    gridCore.deleteRow,
    gridCore.toggleFloatRow,
    gridCore.deleteMultipleRows,
    gridCore.addMultipleRows,
    gridCore.handleDeleteColumn,
    calculateEndTime, // Use the one from useTimeCalculations
    (id: string, color: string) => {
      gridCore.updateItem(id, 'color', color);
    },
    basicState.markAsChanged, // Pass the basic state markAsChanged for auto-save
    gridCore.setRundownTitle
  );
  
  // Optimized column width handler that prevents redundant updates
  const handleColumnWidthChange = (columnId: string, width: number) => {
    // Only update the column width in the columns manager
    gridCore.handleUpdateColumnWidth(columnId, width);
    // The auto-save will be handled by the gridUI hook with proper debouncing
  };
  
  // Grid UI state (colors, editing, etc.) - with optimized column handling
  const gridUI = useRundownGridUI(
    gridCore.items,
    gridCore.visibleColumns,
    gridCore.columns,
    gridCore.updateItem,
    gridCore.currentSegmentId,
    gridCore.currentTime,
    basicState.markAsChanged // This will be debounced in the UI hook
  );

  // Validate and clean time format
  const validateTimeFormat = (timeString: string): string => {
    if (!timeString) return '09:00:00';
    
    // Remove any non-time characters (like the 'd' suffix)
    let cleanTime = timeString.replace(/[^0-9:]/g, '');
    
    // Ensure proper format HH:MM:SS
    const timeParts = cleanTime.split(':');
    if (timeParts.length === 3) {
      const hours = timeParts[0].padStart(2, '0');
      const minutes = timeParts[1].padStart(2, '0');
      const seconds = timeParts[2].padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    
    // Fallback to default
    return '09:00:00';
  };

  // Enhanced timezone setter that triggers change tracking
  const setTimezone = (newTimezone: string) => {
    basicState.setTimezone(newTimezone);
    // Immediately mark as changed to trigger auto-save
    basicState.markAsChanged();
  };

  // Enhanced start time setter that validates and triggers change tracking
  const setRundownStartTime = (newStartTime: string) => {
    const validatedTime = validateTimeFormat(newStartTime);
    basicState.setRundownStartTime(validatedTime);
    // Immediately mark as changed to trigger auto-save
    basicState.markAsChanged();
  };

  // Direct setters for data loading (no change tracking)
  const setTimezoneDirectly = (newTimezone: string) => {
    basicState.setTimezoneDirectly(newTimezone);
  };

  const setRundownStartTimeDirectly = (newStartTime: string) => {
    const validatedTime = validateTimeFormat(newStartTime);
    basicState.setRundownStartTimeDirectly(validatedTime);
  };

  return {
    coreState: {
      ...basicState,
      ...gridCore,
      timezone: basicState.timezone,
      rundownStartTime: validateTimeFormat(basicState.rundownStartTime),
      setTimezone, // Use our enhanced version for UI interactions
      setRundownStartTime, // Use our enhanced version for UI interactions
      setTimezoneDirectly, // Direct setters for data loading
      setRundownStartTimeDirectly, // Direct setters for data loading
      // Override with the properly calculated functions
      calculateEndTime,
      calculateTotalRuntime,
      getRowNumber,
      calculateHeaderDuration
    },
    interactions: gridInteractions,
    uiState: {
      ...gridUI,
      getRowStatus, // Add the getRowStatus function from useTimeCalculations
      // Override updateColumnWidth to use our optimized handler
      updateColumnWidth: handleColumnWidthChange
    }
  };
};
