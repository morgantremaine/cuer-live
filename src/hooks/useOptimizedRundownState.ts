
import { useMemo, useCallback, useRef } from 'react';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useShowcallerVisualState } from './useShowcallerVisualState';
import { useShowcallerRealtimeSync } from './useShowcallerRealtimeSync';
import { useAuth } from './useAuth';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

export const useOptimizedRundownState = () => {
  const { user } = useAuth();
  const userId = user?.id;

  // Core state - single source of truth
  const coreState = useSimplifiedRundownState();
  
  // Showcaller visual state - separate system
  const showcallerVisual = useShowcallerVisualState({
    items: coreState.items,
    rundownId: coreState.rundownId,
    userId: userId
  });

  // Realtime sync for showcaller only
  const showcallerSync = useShowcallerRealtimeSync({
    rundownId: coreState.rundownId,
    onExternalVisualStateReceived: showcallerVisual.applyExternalVisualState,
    enabled: !!coreState.rundownId
  });

  // Memoized calculations to prevent recalculation on every render
  const calculations = useMemo(() => {
    const timeToSeconds = (timeStr: string) => {
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      return 0;
    };

    const secondsToTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate total runtime
    const totalSeconds = coreState.items.reduce((acc, item) => {
      if (item.type === 'header' || item.isFloating || item.isFloated) return acc;
      return acc + timeToSeconds(item.duration || '00:00');
    }, 0);

    return {
      totalRuntime: secondsToTime(totalSeconds),
      timeToSeconds,
      secondsToTime
    };
  }, [coreState.items]);

  // Memoized helper functions
  const helpers = useMemo(() => ({
    calculateEndTime: (startTime: string, duration: string) => {
      const startParts = startTime.split(':').map(Number);
      const durationParts = duration.split(':').map(Number);
      
      let totalSeconds = 0;
      if (startParts.length >= 2) {
        totalSeconds += startParts[0] * 3600 + startParts[1] * 60 + (startParts[2] || 0);
      }
      if (durationParts.length >= 2) {
        totalSeconds += durationParts[0] * 60 + durationParts[1];
      }
      
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },

    addMultipleRows: (newItems: any[]) => {
      const itemsToAdd = newItems.map(item => ({
        ...item,
        id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      coreState.setItems(itemsToAdd);
    }
  }), [coreState.setItems]);

  // Return consolidated interface
  return {
    // Core data
    items: coreState.items,
    columns: coreState.columns,
    visibleColumns: coreState.visibleColumns,
    rundownTitle: coreState.rundownTitle,
    rundownStartTime: coreState.rundownStartTime,
    timezone: coreState.timezone,
    currentTime: coreState.currentTime,
    rundownId: coreState.rundownId,
    
    // State flags
    isLoading: coreState.isLoading,
    hasUnsavedChanges: coreState.hasUnsavedChanges,
    isSaving: coreState.isSaving,
    isConnected: coreState.isConnected || showcallerSync.isConnected,
    
    // Showcaller state
    currentSegmentId: showcallerVisual.currentSegmentId,
    isPlaying: showcallerVisual.isPlaying,
    timeRemaining: showcallerVisual.timeRemaining,
    isController: showcallerVisual.isController,
    
    // Selection
    selectedRowId: coreState.selectedRowId,
    handleRowSelection: coreState.handleRowSelection,
    clearRowSelection: coreState.clearRowSelection,
    
    // Calculations
    totalRuntime: calculations.totalRuntime,
    getRowNumber: coreState.getRowNumber,
    getHeaderDuration: coreState.getHeaderDuration,
    
    // Actions
    updateItem: coreState.updateItem,
    deleteRow: coreState.deleteRow,
    toggleFloatRow: coreState.toggleFloat,
    deleteMultipleItems: coreState.deleteMultipleItems,
    addRow: coreState.addRow,
    addHeader: coreState.addHeader,
    setTitle: coreState.setTitle,
    setStartTime: coreState.setStartTime,
    setTimezone: coreState.setTimezone,
    setItems: coreState.setItems, // Add the missing setItems method
    
    // Column management
    addColumn: coreState.addColumn,
    updateColumnWidth: coreState.updateColumnWidth,
    setColumns: coreState.setColumns,
    
    // Showcaller controls
    play: showcallerVisual.play,
    pause: showcallerVisual.pause,
    forward: showcallerVisual.forward,
    backward: showcallerVisual.backward,
    reset: showcallerVisual.reset,
    jumpToSegment: showcallerVisual.jumpToSegment,
    
    // Helpers
    ...helpers
  };
};
