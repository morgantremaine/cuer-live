
import { useOptimizedRundownState } from './useOptimizedRundownState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';
import { useOptimizedCellRefs } from './useOptimizedCellRefs';
import { useMemoryMonitor } from '@/utils/memoryMonitor';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/utils/logger';

export const useRundownStateCoordination = () => {
  // Use optimized state management
  const optimizedState = useOptimizedRundownState();
  
  // Memory monitoring
  const memoryMonitor = useMemoryMonitor();
  
  // Optimized cell refs
  const { getCellRef, getCell, focusCell, cleanupInactiveCells, cellRefs } = useOptimizedCellRefs();
  
  // Autoscroll state with localStorage persistence
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rundown-autoscroll-enabled');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Persist autoscroll preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rundown-autoscroll-enabled', JSON.stringify(autoScrollEnabled));
    }
  }, [autoScrollEnabled]);

  const toggleAutoScroll = useCallback(() => {
    setAutoScrollEnabled(prev => !prev);
  }, []);

  // Memory cleanup on interval
  useEffect(() => {
    const cleanup = setInterval(() => {
      cleanupInactiveCells();
      if (memoryMonitor.isMemoryHigh()) {
        memoryMonitor.forceGarbageCollection();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(cleanup);
  }, [cleanupInactiveCells, memoryMonitor]);

  // Optimized interactions with debounced updates
  const interactions = useRundownGridInteractions(
    optimizedState.items,
    optimizedState.setItems,
    optimizedState.updateItem,
    optimizedState.addRow,
    optimizedState.addHeader,
    optimizedState.deleteRow,
    optimizedState.toggleFloatRow,
    (ids: string[]) => {
      // Optimized multi-delete
      ids.forEach(id => optimizedState.deleteRow(id));
    },
    (newItems: any[], calcEndTime: (startTime: string, duration: string) => string) => {
      // Optimized multi-add
      newItems.forEach(item => {
        const itemToAdd = {
          ...item,
          id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          endTime: item.endTime || calcEndTime(item.startTime || '00:00:00', item.duration || '00:00')
        };
        optimizedState.addItem(itemToAdd);
      });
    },
    (columnId: string) => {
      const newColumns = optimizedState.columns.filter(col => col.id !== columnId);
      optimizedState.setColumns(newColumns);
    },
    optimizedState.calculateEndTime,
    (id: string, color: string) => {
      optimizedState.updateItem(id, 'color', color);
    },
    optimizedState.markAsChanged,
    optimizedState.setTitle,
    (insertIndex: number) => optimizedState.addRow(),
    (insertIndex: number) => optimizedState.addHeader()
  );

  // Get UI state with optimized cell refs
  const uiState = useRundownUIState(
    optimizedState.items,
    optimizedState.visibleColumns,
    optimizedState.updateItem,
    optimizedState.setColumns,
    optimizedState.columns
  );

  return {
    coreState: {
      ...optimizedState,
      autoScrollEnabled,
      toggleAutoScroll,
      
      // Memory monitoring
      memoryReport: memoryMonitor.getMemoryReport(),
      isMemoryHigh: memoryMonitor.isMemoryHigh(),
      forceGarbageCollection: memoryMonitor.forceGarbageCollection,
      
      // Optimized cell management
      getCellRef,
      getCell,
      focusCell,
      cleanupInactiveCells
    },
    
    interactions: {
      ...interactions,
      // Optimized interactions with memory awareness
      handleCopySelectedRows: () => {
        // Copy logic with memory optimization
        interactions.handleCopySelectedRows();
        cleanupInactiveCells();
      },
      
      handleDeleteSelectedRows: () => {
        // Delete logic with memory cleanup
        interactions.handleDeleteSelectedRows();
        cleanupInactiveCells();
      }
    },
    
    uiState: {
      ...uiState,
      cellRefs // Use optimized cell refs
    }
  };
};
