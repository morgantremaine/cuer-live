import { useOperationBasedRundown } from './useOperationBasedRundown';
import { useAuth } from './useAuth';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';

/**
 * MINIMAL DEBUG HOOK - Bypasses ALL complex coordination
 * Uses ONLY the operation system for state management
 * This is a diagnostic tool to isolate issues
 */
export const useMinimalRundownDebug = () => {
  const { id: rundownId } = useParams();
  const { user } = useAuth();
  const userId = user?.id;

  console.log('🔴 MINIMAL DEBUG HOOK: Initializing', { rundownId, userId });

  // Use ONLY the operation system
  const operationSystem = useOperationBasedRundown({
    rundownId: rundownId || '',
    userId: userId || '',
    enabled: !!rundownId && !!userId
  });

  // Log every time items change
  useEffect(() => {
    console.log('🔴 MINIMAL DEBUG: Items changed', {
      itemCount: operationSystem.items.length,
      items: operationSystem.items,
      isOperationMode: operationSystem.isOperationMode,
      isLoading: operationSystem.isLoading,
      timestamp: new Date().toISOString()
    });
  }, [operationSystem.items, operationSystem.isOperationMode, operationSystem.isLoading]);

  // Simple add row handler
  const addRow = useCallback((insertIndex: number) => {
    console.log('🔴 MINIMAL DEBUG: addRow called', { insertIndex });
    
    const newItem = {
      id: `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'regular',
      rowNumber: '',
      name: 'DEBUG ROW',
      startTime: '',
      duration: '',
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      images: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };

    console.log('🔴 MINIMAL DEBUG: Calling handleRowInsert', { insertIndex, newItem });
    operationSystem.handleRowInsert(insertIndex, newItem);
  }, [operationSystem]);

  // Simple delete row handler
  const deleteRow = useCallback((itemId: string) => {
    console.log('🔴 MINIMAL DEBUG: deleteRow called', { itemId });
    operationSystem.handleRowDelete(itemId);
  }, [operationSystem]);

  // Simple update handler
  const updateItem = useCallback((itemId: string, field: string, value: any) => {
    console.log('🔴 MINIMAL DEBUG: updateItem called', { itemId, field, value });
    operationSystem.handleCellEdit(itemId, field, value);
  }, [operationSystem]);

  return {
    // Core state - DIRECTLY from operation system
    items: operationSystem.items,
    isLoading: operationSystem.isLoading,
    isOperationMode: operationSystem.isOperationMode,
    
    // Simple handlers
    addRow,
    deleteRow,
    updateItem,
    
    // All other fields for compatibility
    rundownTitle: operationSystem.title,
    rundownStartTime: operationSystem.start_time || '09:00:00',
    timezone: operationSystem.timezone || 'America/New_York',
    showDate: operationSystem.show_date,
    currentTime: new Date().toLocaleTimeString('en-US', { hour12: false }),
    isSaving: operationSystem.isSaving,
    hasUnsavedChanges: operationSystem.hasUnsavedChanges,
    lastSaved: operationSystem.lastSaved,
    saveError: operationSystem.saveError,
    
    // Debug info
    debugInfo: {
      itemCount: operationSystem.items.length,
      isOperationMode: operationSystem.isOperationMode,
      isLoading: operationSystem.isLoading,
      queueLength: operationSystem.queueLength,
      isProcessing: operationSystem.isProcessingOperations
    }
  };
};
