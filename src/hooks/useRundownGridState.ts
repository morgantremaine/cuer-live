
import { useParams } from 'react-router-dom';
import { useRundownDataManagement } from './useRundownDataManagement';
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownGridHandlers } from './useRundownGridHandlers';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownGridUI } from './useRundownGridUI';

export const useRundownGridState = () => {
  const { rundownId } = useParams<{ rundownId: string }>();
  
  // Get all data management functionality including polling
  const dataManagement = useRundownDataManagement(rundownId || '');
  
  // Get core grid functionality
  const gridCore = useRundownGridCore(dataManagement);
  
  // Get grid handlers
  const gridHandlers = useRundownGridHandlers(gridCore, dataManagement);
  
  // Get grid interactions
  const gridInteractions = useRundownGridInteractions(gridCore, dataManagement);
  
  // Get UI state
  const gridUI = useRundownGridUI();

  return {
    // Data management (includes polling)
    ...dataManagement,
    
    // Core grid functionality
    ...gridCore,
    
    // Grid handlers
    ...gridHandlers,
    
    // Grid interactions
    ...gridInteractions,
    
    // UI state
    ...gridUI,
    
    // Ensure rundownId is available
    rundownId
  };
};
