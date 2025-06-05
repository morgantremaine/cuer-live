
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useRundownStateIntegration } from './useRundownStateIntegration';

export const useRundownDataManagement = (rundownId: string) => {
  // Initialize undo system
  const undoSystem = useRundownUndo();
  
  // Initialize storage with undo callback
  const storage = useRundownStorage(rundownId, undoSystem.saveState);
  
  // Initialize state integration with storage's markAsChanged
  const stateIntegration = useRundownStateIntegration(
    storage.markAsChanged,
    storage.rundownTitle,
    storage.timezone,
    storage.rundownStartTime,
    storage.setRundownTitleDirectly,
    storage.setTimezoneDirectly
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
