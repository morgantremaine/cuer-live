import { useMemo, useState } from 'react';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownGridUI } from './useRundownGridUI';

export const useRundownStateCoordination = () => {
  // Add missing UI state
  const [showColumnManager, setShowColumnManager] = useState(false);
  
  // Use the simplified state system
  const simplifiedState = useSimplifiedRundownState();
  
  // Grid interactions - fix function signatures
  const gridInteractions = useRundownGridInteractions(
    simplifiedState.items,
    (updater) => {
      if (typeof updater === 'function') {
        const newItems = updater(simplifiedState.items);
        simplifiedState.setItems(newItems);
      }
    },
    simplifiedState.updateItem,
    () => simplifiedState.addRow(),
    () => simplifiedState.addHeader(),
    simplifiedState.deleteRow,
    simplifiedState.toggleFloat,
    simplifiedState.deleteMultipleItems,
    (items) => {
      items.forEach(item => simplifiedState.addItem(item));
    },
    (columnId) => {
      const newColumns = simplifiedState.columns.filter(col => col.id !== columnId);
      simplifiedState.setColumns(newColumns);
    },
    () => '00:00:00',
    (id, color) => simplifiedState.updateItem(id, 'color', color),
    () => {},
    simplifiedState.setTitle
  );
  
  // Grid UI state - fix width parameter type
  const gridUI = useRundownGridUI(
    simplifiedState.items,
    simplifiedState.visibleColumns,
    simplifiedState.columns,
    simplifiedState.updateItem,
    simplifiedState.currentSegmentId,
    simplifiedState.currentTime,
    () => {},
    (columnId: string, width: number) => {
      simplifiedState.updateColumnWidth(columnId, `${width}px`);
    }
  );

  // Simple status calculation
  const getRowStatus = (item: any) => {
    const now = new Date().toLocaleTimeString('en-US', { hour12: false });
    const currentSeconds = timeToSeconds(now);
    const startSeconds = timeToSeconds(item.startTime);
    const endSeconds = timeToSeconds(item.endTime);
    
    if (currentSeconds >= startSeconds && currentSeconds < endSeconds) {
      return 'current';
    } else if (currentSeconds >= endSeconds) {
      return 'completed';
    }
    return 'upcoming';
  };

  const timeToSeconds = (timeStr: string) => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  };

  return {
    coreState: {
      // Basic state
      ...simplifiedState,
      
      // UI state
      showColumnManager,
      setShowColumnManager,
      
      // Renamed functions to match component expectations
      deleteRow: simplifiedState.deleteRow,
      toggleFloatRow: simplifiedState.toggleFloat,
      setRundownTitle: simplifiedState.setTitle,
      
      // Playback controls (simplified)
      timeRemaining: '00:00:00',
      play: () => {},
      pause: () => {},
      forward: () => {},
      backward: () => {},
      
      // Column management functions
      handleAddColumn: simplifiedState.addColumn,
      handleReorderColumns: (columns: any[]) => simplifiedState.setColumns(columns),
      handleDeleteColumn: (columnId: string) => {
        const newColumns = simplifiedState.columns.filter(col => col.id !== columnId);
        simplifiedState.setColumns(newColumns);
      },
      handleRenameColumn: (columnId: string, newName: string) => {
        const newColumns = simplifiedState.columns.map(col =>
          col.id === columnId ? { ...col, name: newName } : col
        );
        simplifiedState.setColumns(newColumns);
      },
      handleToggleColumnVisibility: (columnId: string) => {
        const newColumns = simplifiedState.columns.map(col =>
          col.id === columnId ? { ...col, isVisible: !col.isVisible } : col
        );
        simplifiedState.setColumns(newColumns);
      },
      handleLoadLayout: (columns: any[]) => simplifiedState.setColumns(columns),
      
      // Other missing functions
      markAsChanged: () => {},
      setRundownStartTime: simplifiedState.setStartTime,
      setTimezone: simplifiedState.setTimezone,
      
      // Simplified calculated functions
      calculateEndTime: (startTime: string, duration: string) => {
        const startSeconds = timeToSeconds(startTime);
        const durationSeconds = timeToSeconds(duration);
        const totalSeconds = startSeconds + durationSeconds;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      },
      
      calculateTotalRuntime: () => simplifiedState.totalRuntime,
      calculateHeaderDuration: (index: number) => {
        const item = simplifiedState.items[index];
        return item ? simplifiedState.getHeaderDuration(item.id) : '00:00:00';
      },
      
      // Simplified no-op functions for compatibility
      handleUndo: () => null,
      canUndo: false,
      lastAction: '',
      isConnected: false,
      isProcessingRealtimeUpdate: false
    },
    interactions: gridInteractions,
    uiState: {
      ...gridUI,
      getRowStatus
    }
  };
};
