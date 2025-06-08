
import { useMemo } from 'react';
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownGridUI } from './useRundownGridUI';

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
    setTimezoneDirectly: (newTimezone: string) => {
      console.log('🌍 useRundownStateCoordination: Setting timezone directly:', newTimezone);
      basicState.setTimezoneDirectly(newTimezone);
      // Immediately mark as changed to trigger auto-save
      basicState.markAsChanged();
    },
    isProcessingRealtimeUpdate: false // Will be managed internally by gridCore
  });
  
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
    gridCore.calculateEndTime,
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

  // Enhanced start time setter that triggers change tracking
  const setRundownStartTime = (newStartTime: string) => {
    console.log('⏰ useRundownStateCoordination: Setting start time:', newStartTime);
    basicState.setRundownStartTime(newStartTime);
    // Immediately mark as changed to trigger auto-save
    basicState.markAsChanged();
  };

  return {
    coreState: {
      ...basicState,
      ...gridCore,
      setRundownStartTime // Override with our enhanced version
    },
    interactions: gridInteractions,
    uiState: gridUI
  };
};
