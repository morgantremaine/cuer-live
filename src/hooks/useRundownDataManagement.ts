
import { useEffect } from 'react';
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useRundownBasicState } from './useRundownBasicState';
import { defaultRundownItems } from '@/data/defaultRundownItems';

export const useRundownDataManagement = (rundownId: string) => {
  // Get basic state management
  const basicState = useRundownBasicState();
  
  // Initialize undo system
  const undoSystem = useRundownUndo();
  
  // Initialize storage
  const storage = useRundownStorage();
  
  // Initialize state integration with all required parameters
  const stateIntegration = useRundownStateIntegration(
    basicState.markAsChanged,
    basicState.rundownTitle,
    basicState.timezone,
    basicState.rundownStartTime,
    basicState.setRundownTitleDirectly,
    basicState.setTimezoneDirectly
  );

  // Initialize with default items if this is a new rundown - fix the condition
  useEffect(() => {
    if (!rundownId && stateIntegration.items.length === 0) {
      console.log('Initializing new rundown with default items');
      stateIntegration.setItems(defaultRundownItems);
    }
  }, [rundownId, stateIntegration.items.length, stateIntegration.setItems]);

  return {
    // Basic state
    ...basicState,
    
    // Storage operations
    ...storage,
    
    // State management - ensure all functions are exposed
    ...stateIntegration,
    
    // Undo/Redo operations
    ...undoSystem
  };
};
