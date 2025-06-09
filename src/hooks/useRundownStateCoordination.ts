
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
  
  // Grid-specific core functionality
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

  // Time calculations
  const { calculateEndTime, getRowStatus } = useTimeCalculations(
    gridCore.items, 
    gridCore.updateItem, 
    basicState.rundownStartTime || '09:00:00'
  );

  // Rundown calculations
  const { getRowNumber, calculateTotalRuntime, calculateHeaderDuration } = useRundownCalculations(gridCore.items);
  
  // Grid interactions
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
    calculateEndTime,
    (id: string, color: string) => {
      gridCore.updateItem(id, 'color', color);
    },
    basicState.markAsChanged,
    gridCore.setRundownTitle
  );
  
  // Grid UI state with simplified column handling
  const gridUI = useRundownGridUI(
    gridCore.items,
    gridCore.visibleColumns,
    gridCore.columns,
    gridCore.updateItem,
    gridCore.currentSegmentId,
    gridCore.currentTime,
    basicState.markAsChanged
  );

  // Validate and clean time format
  const validateTimeFormat = (timeString: string): string => {
    if (!timeString) return '09:00:00';
    
    let cleanTime = timeString.replace(/[^0-9:]/g, '');
    
    const timeParts = cleanTime.split(':');
    if (timeParts.length === 3) {
      const hours = timeParts[0].padStart(2, '0');
      const minutes = timeParts[1].padStart(2, '0');
      const seconds = timeParts[2].padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    
    return '09:00:00';
  };

  // Enhanced timezone setter
  const setTimezone = (newTimezone: string) => {
    basicState.setTimezone(newTimezone);
    basicState.markAsChanged();
  };

  // Enhanced start time setter
  const setRundownStartTime = (newStartTime: string) => {
    const validatedTime = validateTimeFormat(newStartTime);
    basicState.setRundownStartTime(validatedTime);
    basicState.markAsChanged();
  };

  // Direct setters for data loading
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
      setTimezone,
      setRundownStartTime,
      setTimezoneDirectly,
      setRundownStartTimeDirectly,
      calculateEndTime,
      calculateTotalRuntime,
      getRowNumber,
      calculateHeaderDuration
    },
    interactions: gridInteractions,
    uiState: {
      ...gridUI,
      getRowStatus
    }
  };
};
