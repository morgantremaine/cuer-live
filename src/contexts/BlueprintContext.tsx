import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { CameraPlotScene } from '@/hooks/cameraPlot/core/useCameraPlotData';
import { RundownItem } from '@/types/rundown';
import { useBlueprintPersistence } from '@/hooks/blueprint/useBlueprintPersistence';
import { useBlueprintPartialSave } from '@/hooks/blueprint/useBlueprintPartialSave';
import { useBlueprintRealtimeSync } from '@/hooks/blueprint/useBlueprintRealtimeSync';
import { generateListFromColumn } from '@/utils/blueprintUtils';
import { logger } from '@/utils/logger';

export interface BlueprintState {
  lists: BlueprintList[];
  showDate: string;
  notes: string;
  cameraPlots: CameraPlotScene[];
  componentOrder: string[];
  isLoading: boolean;
  isInitialized: boolean;
  isSaving: boolean;
  lastSaved: string | null;
  error: string | null;
}

export type BlueprintAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LAST_SAVED'; payload: string }
  | { type: 'UPDATE_LISTS'; payload: BlueprintList[] }
  | { type: 'UPDATE_SHOW_DATE'; payload: string }
  | { type: 'UPDATE_NOTES'; payload: string }
  | { type: 'UPDATE_CAMERA_PLOTS'; payload: CameraPlotScene[] }
  | { type: 'UPDATE_COMPONENT_ORDER'; payload: string[] }
  | { type: 'MERGE_REMOTE_STATE'; payload: Partial<BlueprintState> }
  | { type: 'RESET_STATE' };

const initialState: BlueprintState = {
  lists: [],
  showDate: '',
  notes: '',
  cameraPlots: [],
  componentOrder: ['camera-plot', 'scratchpad'], // Removed 'crew-list'
  isLoading: false,
  isInitialized: false,
  isSaving: false,
  lastSaved: null,
  error: null
};

function blueprintReducer(state: BlueprintState, action: BlueprintAction): BlueprintState {
  // Safe logging that handles actions with and without payload
  const logMessage = 'payload' in action ? action.payload : 'no payload';
  logger.blueprint('Blueprint reducer action:', { type: action.type, payload: logMessage });
  
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LAST_SAVED':
      return { ...state, lastSaved: action.payload };
    case 'UPDATE_LISTS':
      logger.blueprint('Updating lists in reducer:', action.payload);
      return { ...state, lists: action.payload };
    case 'UPDATE_SHOW_DATE':
      logger.blueprint('Updating show date in reducer:', action.payload);
      return { ...state, showDate: action.payload };
    case 'UPDATE_NOTES':
      logger.blueprint('Updating notes in reducer:', { length: action.payload.length });
      return { ...state, notes: action.payload };
    case 'UPDATE_CAMERA_PLOTS':
      logger.blueprint('Updating camera plots in reducer:', { count: action.payload.length });
      return { ...state, cameraPlots: action.payload };
    case 'UPDATE_COMPONENT_ORDER':
      logger.blueprint('Updating component order in reducer:', action.payload);
      return { ...state, componentOrder: action.payload };
    case 'MERGE_REMOTE_STATE':
      logger.blueprint('Merging remote state in reducer:', Object.keys(action.payload));
      logger.blueprint('DETAILED MERGE - Current lists count:', state.lists.length);
      logger.blueprint('DETAILED MERGE - Incoming lists count:', action.payload.lists?.length || 0);
      logger.blueprint('DETAILED MERGE - Current component order:', state.componentOrder);
      logger.blueprint('DETAILED MERGE - Incoming component order:', action.payload.componentOrder);
      
      // Log detailed list information for debugging
      if (action.payload.lists) {
        action.payload.lists.forEach((list, index) => {
          logger.blueprint(`DETAILED MERGE - List ${index}: ${list.name} (${list.id}) - ${Object.keys(list.checkedItems || {}).length} checked items`);
          logger.blueprint(`DETAILED MERGE - List ${index} checked items:`, list.checkedItems);
        });
      }
      
      return {
        ...state,
        ...action.payload,
        // Preserve local loading states
        isLoading: state.isLoading,
        isSaving: state.isSaving
      };
    case 'RESET_STATE':
      logger.blueprint('Resetting blueprint state');
      return { ...initialState };
    default:
      return state;
  }
}

interface BlueprintContextValue {
  state: BlueprintState;
  dispatch: React.Dispatch<BlueprintAction>;
  
  // List operations
  updateLists: (lists: BlueprintList[]) => void;
  addList: (list: BlueprintList) => void;
  deleteList: (listId: string) => void;
  renameList: (listId: string, newName: string) => void;
  updateCheckedItems: (listId: string, checkedItems: Record<string, boolean>) => void;
  
  // Other data operations
  updateShowDate: (date: string) => void;
  updateNotes: (notes: string) => void;
  updateCameraPlots: (plots: CameraPlotScene[]) => void;
  updateComponentOrder: (order: string[]) => void;
  
  // Utility functions
  saveBlueprint: () => Promise<void>;
  refreshBlueprint: () => Promise<void>;
  autoRefreshLists: (rundownItems: RundownItem[]) => void;
  
  // Rundown data
  rundownData: {
    id: string;
    title: string;
    items: RundownItem[];
  } | null;
}

const BlueprintContext = createContext<BlueprintContextValue | null>(null);

interface BlueprintProviderProps {
  children: ReactNode;
  rundownId: string;
  rundownTitle: string;
  rundownItems?: RundownItem[];
  isDemoMode?: boolean;
}

export const BlueprintProvider: React.FC<BlueprintProviderProps> = ({
  children,
  rundownId,
  rundownTitle,
  rundownItems = [],
  isDemoMode = false
}) => {
  const [state, dispatch] = useReducer(blueprintReducer, initialState);
  const [savedBlueprint, setSavedBlueprint] = React.useState<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const initializationRef = useRef(false);
  const autoRefreshTriggeredRef = useRef(false);

  const { loadBlueprint } = useBlueprintPersistence(
    rundownId,
    rundownTitle,
    state.showDate,
    savedBlueprint,
    setSavedBlueprint,
    isDemoMode
  );

  // Use partial save hooks for different components (removed crew data)
  const {
    saveListsOnly,
    saveNotesOnly,
    saveCameraPlotsOnly,
    saveComponentOrderOnly,
    saveShowDateOnly
  } = useBlueprintPartialSave(
    rundownId,
    rundownTitle,
    state.showDate,
    savedBlueprint,
    setSavedBlueprint,
    isDemoMode
  );

  // Setup realtime sync
  useBlueprintRealtimeSync({
    rundownId,
    onRemoteUpdate: (remoteState) => {
      logger.blueprint('Received remote blueprint update:', remoteState);
      dispatch({ type: 'MERGE_REMOTE_STATE', payload: remoteState });
    },
    enabled: state.isInitialized
  });

  // Initialize blueprint data
  useEffect(() => {
    if (!rundownId || state.isInitialized || initializationRef.current) return;
    
    initializationRef.current = true;
    
    const initializeBlueprint = async () => {
      try {
        logger.blueprint('Initializing blueprint for rundown:', rundownId);
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        
        const blueprintData = await loadBlueprint();
        
        if (blueprintData) {
          logger.blueprint('Loaded existing blueprint data:', {
            lists: blueprintData.lists?.length || 0,
            showDate: blueprintData.show_date,
            notes: blueprintData.notes?.length || 0,
            cameraPlots: blueprintData.camera_plots?.length || 0,
            componentOrder: blueprintData.component_order
          });
          
          // Enhanced logging for debugging checkbox and order issues
          logger.blueprint('INITIALIZATION - Raw blueprint data from DB:', blueprintData);
          logger.blueprint('INITIALIZATION - Lists data:', blueprintData.lists);
          if (blueprintData.lists) {
            blueprintData.lists.forEach((list: any, index: number) => {
              logger.blueprint(`INITIALIZATION - List ${index}: ${list.name} - checkedItems:`, list.checkedItems);
            });
          }
          logger.blueprint('INITIALIZATION - Component order:', blueprintData.component_order);
          
          dispatch({ type: 'MERGE_REMOTE_STATE', payload: {
            lists: blueprintData.lists || [],
            showDate: blueprintData.show_date || '',
            notes: blueprintData.notes || '',
            cameraPlots: blueprintData.camera_plots || [],
            componentOrder: blueprintData.component_order || ['camera-plot', 'scratchpad'] // Removed 'crew-list'
          }});
          
          // Mark that we'll need to auto-refresh once rundown items are available
          autoRefreshTriggeredRef.current = false;
        } else {
          logger.blueprint('No existing blueprint found, starting with empty state');
          autoRefreshTriggeredRef.current = false;
        }
        
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      } catch (error) {
        logger.error('Failed to initialize blueprint:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load blueprint data' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        initializationRef.current = false;
      }
    };
    
    initializeBlueprint();
  }, [rundownId, loadBlueprint, state.isInitialized]);

  // Auto-refresh lists when blueprint is initialized and rundown items are available
  useEffect(() => {
    if (
      state.isInitialized && 
      rundownItems.length > 0 && 
      state.lists.length > 0 && 
      !autoRefreshTriggeredRef.current &&
      !state.isLoading
    ) {
      logger.blueprint('Auto-refreshing lists with current rundown data on initialization');
      autoRefreshTriggeredRef.current = true;
      
      // Refresh all lists with current rundown data
      const refreshedLists = state.lists.map(list => ({
        ...list,
        items: generateListFromColumn(rundownItems, list.sourceColumn)
        // Preserve existing checkedItems and other properties
      }));
      
      // Only update if there are actual changes
      const listsChanged = refreshedLists.some((refreshedList, index) => {
        const originalList = state.lists[index];
        return !originalList || 
               JSON.stringify(refreshedList.items) !== JSON.stringify(originalList.items);
      });
      
      if (listsChanged) {
        logger.blueprint('Lists changed, updating with refreshed data');
        dispatch({ type: 'UPDATE_LISTS', payload: refreshedLists });
        
        // Save the refreshed lists
        const debouncedSave = createDebouncedSave(() => saveListsOnly(refreshedLists));
        debouncedSave();
      } else {
        logger.blueprint('No changes detected in lists, skipping update');
      }
    }
  }, [state.isInitialized, rundownItems, state.lists, state.isLoading, saveListsOnly]);

  // Enhanced debounced save function with partial saves
  const createDebouncedSave = React.useCallback((saveFunction: () => Promise<void>, delay: number = 1000) => {
    return () => {
      if (!state.isInitialized) {
        logger.blueprint('Save skipped - not initialized yet');
        return;
      }
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          dispatch({ type: 'SET_SAVING', payload: true });
          dispatch({ type: 'SET_ERROR', payload: null });
          
          await saveFunction();
          
          const timestamp = new Date().toISOString();
          dispatch({ type: 'SET_LAST_SAVED', payload: timestamp });
          logger.blueprint('Blueprint component saved successfully at', timestamp);
        } catch (error) {
          logger.error('Failed to save blueprint component:', error);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to save blueprint' });
        } finally {
          dispatch({ type: 'SET_SAVING', payload: false });
        }
      }, delay);
    };
  }, [state.isInitialized]);

  // Manual refresh function for user-triggered refreshes
  const autoRefreshLists = React.useCallback((currentRundownItems: RundownItem[]) => {
    if (state.lists.length === 0 || currentRundownItems.length === 0) {
      logger.blueprint('Skipping auto-refresh - no lists or rundown items available');
      return;
    }
    
    logger.blueprint('Manual auto-refresh triggered for lists');
    
    const refreshedLists = state.lists.map(list => ({
      ...list,
      items: generateListFromColumn(currentRundownItems, list.sourceColumn)
      // Preserve existing checkedItems and other properties
    }));
    
    dispatch({ type: 'UPDATE_LISTS', payload: refreshedLists });
    
    const debouncedSave = createDebouncedSave(() => saveListsOnly(refreshedLists));
    debouncedSave();
  }, [state.lists, createDebouncedSave, saveListsOnly]);

  const updateLists = React.useCallback((lists: BlueprintList[]) => {
    logger.blueprint('Context updateLists called with:', { count: lists.length });
    logger.blueprint('Context updateLists - detailed data:');
    lists.forEach((list, index) => {
      logger.blueprint(`Context updateLists - List ${index}: ${list.name} - checkedItems:`, list.checkedItems);
    });
    dispatch({ type: 'UPDATE_LISTS', payload: lists });
    
    const debouncedSave = createDebouncedSave(() => saveListsOnly(lists));
    debouncedSave();
  }, [createDebouncedSave, saveListsOnly]);

  const addList = React.useCallback((list: BlueprintList) => {
    logger.blueprint('Context addList called with:', list.name);
    logger.blueprint('Context addList - checkedItems:', list.checkedItems);
    const newLists = [...state.lists, list];
    dispatch({ type: 'UPDATE_LISTS', payload: newLists });
    
    const debouncedSave = createDebouncedSave(() => saveListsOnly(newLists));
    debouncedSave();
  }, [state.lists, createDebouncedSave, saveListsOnly]);

  const deleteList = React.useCallback((listId: string) => {
    logger.blueprint('Context deleteList called for:', listId);
    const newLists = state.lists.filter(list => list.id !== listId);
    dispatch({ type: 'UPDATE_LISTS', payload: newLists });
    
    const debouncedSave = createDebouncedSave(() => saveListsOnly(newLists));
    debouncedSave();
  }, [state.lists, createDebouncedSave, saveListsOnly]);

  const renameList = React.useCallback((listId: string, newName: string) => {
    logger.blueprint('Context renameList called:', { listId, newName });
    const updatedLists = state.lists.map(list => 
      list.id === listId ? { ...list, name: newName } : list
    );
    dispatch({ type: 'UPDATE_LISTS', payload: updatedLists });
    
    const debouncedSave = createDebouncedSave(() => saveListsOnly(updatedLists));
    debouncedSave();
  }, [state.lists, createDebouncedSave, saveListsOnly]);

  const updateCheckedItems = React.useCallback((listId: string, checkedItems: Record<string, boolean>) => {
    logger.blueprint('Context updateCheckedItems called for:', { listId, itemCount: Object.keys(checkedItems).length });
    logger.blueprint('Context updateCheckedItems - detailed checkedItems:', checkedItems);
    const updatedLists = state.lists.map(list => 
      list.id === listId ? { ...list, checkedItems } : list
    );
    logger.blueprint('Context updateCheckedItems - updated list:', updatedLists.find(l => l.id === listId));
    dispatch({ type: 'UPDATE_LISTS', payload: updatedLists });
    
    const debouncedSave = createDebouncedSave(() => saveListsOnly(updatedLists));
    debouncedSave();
  }, [state.lists, createDebouncedSave, saveListsOnly]);

  const updateShowDate = React.useCallback((date: string) => {
    logger.blueprint('Context updateShowDate called with:', date);
    dispatch({ type: 'UPDATE_SHOW_DATE', payload: date });
    
    const debouncedSave = createDebouncedSave(() => saveShowDateOnly(date));
    debouncedSave();
  }, [createDebouncedSave, saveShowDateOnly]);

  const updateNotes = React.useCallback((notes: string) => {
    logger.blueprint('Context updateNotes called with', { length: notes.length });
    dispatch({ type: 'UPDATE_NOTES', payload: notes });
    
    const debouncedSave = createDebouncedSave(() => saveNotesOnly(notes));
    debouncedSave();
  }, [createDebouncedSave, saveNotesOnly]);

  const updateCameraPlots = React.useCallback((plots: CameraPlotScene[]) => {
    logger.blueprint('Context updateCameraPlots called with', { count: plots.length });
    dispatch({ type: 'UPDATE_CAMERA_PLOTS', payload: plots });
    
    const debouncedSave = createDebouncedSave(() => saveCameraPlotsOnly(plots));
    debouncedSave();
  }, [createDebouncedSave, saveCameraPlotsOnly]);

  const updateComponentOrder = React.useCallback((order: string[]) => {
    logger.blueprint('Context updateComponentOrder called with:', order);
    dispatch({ type: 'UPDATE_COMPONENT_ORDER', payload: order });
    
    const debouncedSave = createDebouncedSave(() => saveComponentOrderOnly(order));
    debouncedSave();
  }, [createDebouncedSave, saveComponentOrderOnly]);

  const saveBlueprint = React.useCallback(async () => {
    logger.blueprint('Manual save triggered - this will now be handled by partial saves automatically');
  }, []);

  const refreshBlueprint = React.useCallback(async () => {
    logger.blueprint('Manual refresh triggered');
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const blueprintData = await loadBlueprint();
      
      if (blueprintData) {
        logger.blueprint('REFRESH - Raw blueprint data from DB:', blueprintData);
        dispatch({ type: 'MERGE_REMOTE_STATE', payload: {
          lists: blueprintData.lists || [],
          showDate: blueprintData.show_date || '',
          notes: blueprintData.notes || '',
          cameraPlots: blueprintData.camera_plots || [],
          componentOrder: blueprintData.component_order || ['camera-plot', 'scratchpad'] // Removed 'crew-list'
        }});
      }
    } catch (error) {
      logger.error('Failed to refresh blueprint:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to refresh blueprint' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [loadBlueprint]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const contextValue: BlueprintContextValue = {
    state,
    dispatch,
    updateLists,
    addList,
    deleteList,
    renameList,
    updateCheckedItems,
    updateShowDate,
    updateNotes,
    updateCameraPlots,
    updateComponentOrder,
    saveBlueprint,
    refreshBlueprint,
    autoRefreshLists,
    rundownData: {
      id: rundownId,
      title: rundownTitle,
      items: rundownItems
    }
  };

  return (
    <BlueprintContext.Provider value={contextValue}>
      {children}
    </BlueprintContext.Provider>
  );
};

export const useBlueprintContext = () => {
  const context = useContext(BlueprintContext);
  if (!context) {
    throw new Error('useBlueprintContext must be used within a BlueprintProvider');
  }
  return context;
};
