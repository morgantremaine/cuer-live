
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
    isProcessingRealtimeUpdate: false
  });

  // Add the time calculations hook that was missing
  const { calculateEndTime, getRowStatus } = useTimeCalculations(
    gridCore.items, 
    gridCore.updateItem, 
    gridCore.rundownStartTime || basicState.rundownStartTime
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
    gridCore.markAsChanged,
    gridCore.setRundownTitle
  );
  
  // Grid UI state (colors, editing, etc.)
  const gridUI = useRundownGridUI(
    gridCore.items,
    gridCore.visibleColumns,
    gridCore.columns,
    gridCore.updateItem,
    gridCore.currentSegmentId,
    gridCore.currentTime,
    gridCore.markAsChanged
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
    console.log('🌍 useRundownStateCoordination: Setting timezone:', newTimezone);
    basicState.setTimezone(newTimezone);
    // Immediately mark as changed to trigger auto-save
    basicState.markAsChanged();
  };

  // Enhanced start time setter that validates and triggers change tracking
  const setRundownStartTime = (newStartTime: string) => {
    const validatedTime = validateTimeFormat(newStartTime);
    console.log('⏰ useRundownStateCoordination: Setting start time:', { original: newStartTime, validated: validatedTime });
    basicState.setRundownStartTime(validatedTime);
    // Immediately mark as changed to trigger auto-save
    basicState.markAsChanged();
  };

  // Direct setters for data loading (no change tracking)
  const setTimezoneDirectly = (newTimezone: string) => {
    console.log('🌍 useRundownStateCoordination: Setting timezone directly (no auto-save):', newTimezone);
    basicState.setTimezoneDirectly(newTimezone);
  };

  const setRundownStartTimeDirectly = (newStartTime: string) => {
    const validatedTime = validateTimeFormat(newStartTime);
    console.log('⏰ useRundownStateCoordination: Setting start time directly (no auto-save):', { original: newStartTime, validated: validatedTime });
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
      getRowStatus // Add the getRowStatus function from useTimeCalculations
    }
  };
};
