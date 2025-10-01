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
  onUnsavedChanges
}: CellEditIntegrationProps) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isPerCellSaving, setIsPerCellSaving] = useState(false);
  const [hasPerCellUnsavedChanges, setHasPerCellUnsavedChanges] = useState(false);
  
  const { user } = useAuth();
  
  // Always use operation mode - no toggle needed
  const operationSystem = useOperationBasedRundown({
    rundownId: rundownId || '',
    userId: user?.id || '',
    enabled: true // Always enabled
  });

  // Only log when operation mode changes, not on every render
  const prevOperationMode = useRef(operationSystem.isOperationMode);
  if (prevOperationMode.current !== operationSystem.isOperationMode) {
    console.log('🚀 OPERATION SYSTEM ACTIVE:', {
      rundownId,
      userId: user?.id,
      isOperationMode: operationSystem.isOperationMode,
      operationSystemEnabled: true
    });
    prevOperationMode.current = operationSystem.isOperationMode;
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
      operationSystemEnabled: operationSystem.isOperationMode,
      rundownId,
      timestamp: new Date().toISOString()
    });
    
    // Always route through operation system
    if (operationSystem.isOperationMode && itemId) {
      console.log('🚀 ROUTING THROUGH OPERATION SYSTEM:', {
        itemId,
        fieldName,
        newValue,
        operationSystemActive: true
      });
      
      operationSystem.handleCellEdit(itemId, fieldName, newValue);
      debugLogger.autosave(`Operation cell edit: ${fieldName} for item ${itemId}`);
      
      console.log('✅ OPERATION SYSTEM: Cell edit queued successfully');
      return;
    }
    
    // Legacy fallback (should rarely be used now)
    if (!isPerCellEnabled) {
      console.log('⚠️ CELL EDIT INTEGRATION: Per-cell disabled, using normal tracking');
      debugLogger.autosave(`Cell change (non-per-cell): ${fieldName} for item ${itemId || 'global'}`);
      return;
    }

    console.log('🔄 CELL EDIT INTEGRATION: Per-cell enabled, tracking field change');
    trackFieldChange(itemId, fieldName, newValue);
    debugLogger.autosave(`Per-cell change tracked: ${fieldName} for item ${itemId || 'global'}`);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, [isPerCellEnabled, operationSystem, trackFieldChange]);

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
    // Use operation-based save state when operation mode is active
    hasUnsavedChanges: operationSystem.isOperationMode ? 
      operationSystem.hasUnsavedChanges : 
      hasPerCellUnsavedChanges,
    isPerCellEnabled,
    isPerCellSaving: operationSystem.isOperationMode ? 
      operationSystem.isSaving : 
      isPerCellSaving,
    
    // Enhanced save state for smart indicators
    saveState: {
      isSaving: operationSystem.isOperationMode ? operationSystem.isSaving : isPerCellSaving,
      hasUnsavedChanges: operationSystem.isOperationMode ? operationSystem.hasUnsavedChanges : hasPerCellUnsavedChanges,
      lastSaved: operationSystem.lastSaved,
      saveError: operationSystem.saveError,
      hasContentChanges: true,
      isTyping: operationSystem.isTyping,
      showSaved: operationSystem.showSaved
    },
    
    // Keystroke handler for smart save indicators
    handleKeystroke: operationSystem.handleKeystroke,
    
    // Expose operation system state for debugging
    operationSystemActive: operationSystem.isOperationMode,
    operationSystemSaving: operationSystem.isSaving,
    operationSystemUnsaved: operationSystem.hasUnsavedChanges,
    operationLastSaved: operationSystem.lastSaved,
    
    // CRITICAL: Expose structural operation handlers for drag-and-drop coordination
    // This ensures drag-and-drop operations flow through the OT system for perfect coordination
    operationHandlers: operationSystem.isOperationMode ? {
      handleRowMove: operationSystem.handleRowMove,
      handleRowInsert: operationSystem.handleRowInsert,
      handleRowDelete: operationSystem.handleRowDelete,
      handleRowCopy: operationSystem.handleRowCopy
    } : undefined
  };
};