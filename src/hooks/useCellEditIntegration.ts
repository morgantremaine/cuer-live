import { useCallback, useRef, useState } from 'react';
import { usePerCellSaveCoordination } from './usePerCellSaveCoordination';
import { useOperationBasedRundown } from './useOperationBasedRundown';
import { useAuth } from './useAuth';
import { debugLogger } from '@/utils/debugLogger';

interface CellEditIntegrationProps {
  rundownId: string | null;
  isPerCellEnabled: boolean;
  onSaveComplete?: () => void;
  onSaveStart?: () => void;
  onUnsavedChanges?: () => void;
  operationSystem?: any; // Receive operation system from parent instead of creating own
}

/**
 * Integration hook that connects cell editing UI components with the per-cell save system.
 * This replaces the need for full document saves when individual cells are edited.
 */
export const useCellEditIntegration = ({
  rundownId,
  isPerCellEnabled,
  onSaveComplete,
  onSaveStart,
  onUnsavedChanges,
  operationSystem: providedOperationSystem
}: CellEditIntegrationProps) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isPerCellSaving, setIsPerCellSaving] = useState(false);
  const [hasPerCellUnsavedChanges, setHasPerCellUnsavedChanges] = useState(false);
  
  const { user } = useAuth();
  
  // Use provided operation system (from parent) - DO NOT create a duplicate
  // This prevents multiple broadcast subscriptions and competing state
  const operationSystem = providedOperationSystem || {
    isOperationMode: false,
    handleCellEdit: () => {},
    isSaving: false,
    hasUnsavedChanges: false,
    lastSaved: null,
    saveError: null,
    isTyping: false,
    showSaved: false,
    handleKeystroke: () => {}
  };

  // Only log when realtime system changes, not on every render
  const prevRealtimeMode = useRef(!!operationSystem.handleCellEdit);
  if (prevRealtimeMode.current !== !!operationSystem.handleCellEdit) {
    console.log('🚀 REALTIME SYSTEM ACTIVE:', {
      rundownId,
      userId: user?.id,
      realtimeEnabled: !!operationSystem.handleCellEdit,
      realtimeSystemEnabled: true
    });
    prevRealtimeMode.current = !!operationSystem.handleCellEdit;
  }

  // Get the coordinated save system (per-cell saves are always enabled)
  const { trackFieldChange, hasUnsavedChanges } = usePerCellSaveCoordination({
    rundownId,
    onSaveComplete: () => {
      console.log('🧪 CELL EDIT INTEGRATION: Per-cell save completed');
      setIsPerCellSaving(false);
      setHasPerCellUnsavedChanges(false);
      if (onSaveComplete) {
        onSaveComplete();
      }
    },
    onSaveStart: () => {
      console.log('🧪 CELL EDIT INTEGRATION: Per-cell save started');
      setIsPerCellSaving(true);
      if (onSaveStart) {
        onSaveStart();
      }
    },
    onUnsavedChanges: () => {
      console.log('🧪 CELL EDIT INTEGRATION: Per-cell unsaved changes detected');
      setHasPerCellUnsavedChanges(true);
      if (onUnsavedChanges) {
        onUnsavedChanges();
      }
    }
  });

  // Handle cell value changes from editing components
  const handleCellChange = useCallback((
    itemId: string | undefined,
    fieldName: string,
    newValue: any
  ) => {
    console.log('🎯 CELL EDIT INTEGRATION: handleCellChange called', {
      itemId,
      fieldName,
      newValue: typeof newValue === 'string' ? newValue.substring(0, 50) : newValue,
      realtimeEnabled: !!operationSystem.handleCellEdit,
      rundownId,
      timestamp: new Date().toISOString()
    });
    
    // Always route through real-time system for instant updates
    if (itemId) {
      console.log('🚀 ROUTING THROUGH REALTIME SYSTEM:', {
        itemId,
        fieldName,
        newValue,
        realtimeActive: true
      });
      
      operationSystem.handleCellEdit(itemId, fieldName, newValue);
      debugLogger.autosave(`Realtime cell edit: ${fieldName} for item ${itemId}`);
      
      console.log('✅ REALTIME SYSTEM: Cell edit applied immediately');
      return;
    }
    
    // Fallback for global fields
    debugLogger.autosave(`Cell change (global): ${fieldName}`);
  }, [operationSystem, trackFieldChange]);

  // Handle when user starts editing a cell (for LocalShadow integration)
  const handleCellEditStart = useCallback((
    itemId: string | undefined,
    fieldName: string,
    currentValue: any
  ) => {
    if (!isPerCellEnabled) return;

    debugLogger.autosave(`Cell edit started: ${fieldName} for item ${itemId || 'global'}`);
    
    // The LocalShadow system will be managed by the underlying save coordination
    // This hook just provides the integration point for UI components
  }, [isPerCellEnabled]);

  // Handle when user finishes editing a cell
  const handleCellEditComplete = useCallback((
    itemId: string | undefined,
    fieldName: string,
    finalValue: any
  ) => {
    if (!isPerCellEnabled) return;

    debugLogger.autosave(`Cell edit completed: ${fieldName} for item ${itemId || 'global'}`);
    
    // Final value change will trigger the coordinated save
    trackFieldChange(itemId, fieldName, finalValue);
  }, [isPerCellEnabled, trackFieldChange]);

  return {
    handleCellChange,
    handleCellEditStart,
    handleCellEditComplete,
    // Use real-time system save state when active
    hasUnsavedChanges: operationSystem.handleCellEdit ? 
      operationSystem.hasUnsavedChanges : 
      hasPerCellUnsavedChanges,
    isPerCellEnabled,
    isPerCellSaving: operationSystem.handleCellEdit ? 
      operationSystem.isSaving : 
      isPerCellSaving,
    
    // Enhanced save state for smart indicators
    saveState: {
      isSaving: operationSystem.handleCellEdit ? operationSystem.isSaving : isPerCellSaving,
      hasUnsavedChanges: operationSystem.handleCellEdit ? operationSystem.hasUnsavedChanges : hasPerCellUnsavedChanges,
      lastSaved: operationSystem.lastSaved,
      saveError: operationSystem.saveError,
      hasContentChanges: true,
      isTyping: false,
      showSaved: operationSystem.lastSaved ? Date.now() - operationSystem.lastSaved < 3000 : false
    },
    
    // Keystroke handler for smart save indicators
    handleKeystroke: () => {}, // No-op for now
    
    // Expose real-time system state for debugging
    operationSystemActive: !!operationSystem.handleCellEdit,
    operationSystemSaving: operationSystem.isSaving,
    operationSystemUnsaved: operationSystem.hasUnsavedChanges,
    operationLastSaved: operationSystem.lastSaved
  };
};