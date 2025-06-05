
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useRundownStateIntegration } from './useRundownStateIntegration';

export const useRundownDataManagement = (rundownId: string) => {
  // Initialize undo system - fix: call without arguments
  const undoSystem = useRundownUndo();
  
  // Initialize storage
  const storage = useRundownStorage(rundownId);
  
  // Create a dummy markAsChanged function if not available
  const markAsChanged = () => {};
  
  // Initialize state integration with dummy values for missing properties
  const stateIntegration = useRundownStateIntegration(
    markAsChanged,
    '', // rundownTitle fallback
    'UTC', // timezone fallback
    '', // rundownStartTime fallback
    () => {}, // setRundownTitleDirectly fallback
    () => {} // setTimezoneDirectly fallback
  );

  return {
    // Storage operations
    ...storage,
    
    // State management
    ...stateIntegration,
    
    // Undo/Redo operations
    ...undoSystem
  };
};
