import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { CrewMember } from '@/types/crew';
import { CameraPlotScene } from '@/hooks/cameraPlot/core/useCameraPlotData';
import { useBlueprintPersistence } from '@/hooks/blueprint/useBlueprintPersistence';
import { useBlueprintRealtimeSync } from '@/hooks/blueprint/useBlueprintRealtimeSync';

export interface BlueprintState {
  lists: BlueprintList[];
  showDate: string;
  notes: string;
  crewData: CrewMember[];
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
  | { type: 'UPDATE_CREW_DATA'; payload: CrewMember[] }
  | { type: 'UPDATE_CAMERA_PLOTS'; payload: CameraPlotScene[] }
  | { type: 'UPDATE_COMPONENT_ORDER'; payload: string[] }
  | { type: 'MERGE_REMOTE_STATE'; payload: Partial<BlueprintState> }
  | { type: 'RESET_STATE' };

const initialState: BlueprintState = {
  lists: [],
  showDate: '',
  notes: '',
  crewData: [],
  cameraPlots: [],
  componentOrder: ['crew-list', 'camera-plot', 'scratchpad'],
  isLoading: false,
  isInitialized: false,
  isSaving: false,
  lastSaved: null,
  error: null
};

function blueprintReducer(state: BlueprintState, action: BlueprintAction): BlueprintState {
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
      return { ...state, lists: action.payload };
    case 'UPDATE_SHOW_DATE':
      return { ...state, showDate: action.payload };
    case 'UPDATE_NOTES':
      return { ...state, notes: action.payload };
    case 'UPDATE_CREW_DATA':
      return { ...state, crewData: action.payload };
    case 'UPDATE_CAMERA_PLOTS':
      return { ...state, cameraPlots: action.payload };
    case 'UPDATE_COMPONENT_ORDER':
      return { ...state, componentOrder: action.payload };
    case 'MERGE_REMOTE_STATE':
      return {
        ...state,
        ...action.payload,
        // Preserve local loading states
        isLoading: state.isLoading,
        isSaving: state.isSaving
      };
    case 'RESET_STATE':
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
  updateCrewData: (crewData: CrewMember[]) => void;
  updateCameraPlots: (plots: CameraPlotScene[]) => void;
  updateComponentOrder: (order: string[]) => void;
  
  // Utility functions
  saveBlueprint: () => Promise<void>;
  refreshBlueprint: () => Promise<void>;
}

const BlueprintContext = createContext<BlueprintContextValue | null>(null);

interface BlueprintProviderProps {
  children: ReactNode;
  rundownId: string;
  rundownTitle: string;
}

export const BlueprintProvider: React.FC<BlueprintProviderProps> = ({
  children,
  rundownId,
  rundownTitle
}) => {
  const [state, dispatch] = useReducer(blueprintReducer, initialState);
  const [savedBlueprint, setSavedBlueprint] = React.useState<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const initializationRef = useRef(false);

  const { loadBlueprint, saveBlueprint: persistBlueprint } = useBlueprintPersistence(
    rundownId,
    rundownTitle,
    state.showDate,
    savedBlueprint,
    setSavedBlueprint
  );

  // Setup realtime sync
  useBlueprintRealtimeSync({
    rundownId,
    onRemoteUpdate: (remoteState) => {
      console.log('📋 Merging remote blueprint state:', remoteState);
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
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        
        console.log('📋 Loading blueprint for rundown:', rundownId);
        const blueprintData = await loadBlueprint();
        
        if (blueprintData) {
          console.log('📋 Loaded blueprint data:', blueprintData);
          dispatch({ type: 'MERGE_REMOTE_STATE', payload: {
            lists: blueprintData.lists || [],
            showDate: blueprintData.show_date || '',
            notes: blueprintData.notes || '',
            crewData: blueprintData.crew_data || [],
            cameraPlots: blueprintData.camera_plots || [],
            componentOrder: blueprintData.component_order || ['crew-list', 'camera-plot', 'scratchpad']
          }});
        }
        
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      } catch (error) {
        console.error('📋 Failed to initialize blueprint:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load blueprint data' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        initializationRef.current = false;
      }
    };
    
    initializeBlueprint();
  }, [rundownId, loadBlueprint, state.isInitialized]);

  // Debounced save function
  const debouncedSave = React.useCallback(async () => {
    if (!state.isInitialized) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        dispatch({ type: 'SET_SAVING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        
        await persistBlueprint(
          state.lists,
          true, // silent save
          state.showDate,
          state.notes,
          state.crewData,
          state.cameraPlots,
          state.componentOrder
        );
        
        dispatch({ type: 'SET_LAST_SAVED', payload: new Date().toISOString() });
        console.log('📋 Blueprint saved successfully');
      } catch (error) {
        console.error('📋 Failed to save blueprint:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to save blueprint' });
      } finally {
        dispatch({ type: 'SET_SAVING', payload: false });
      }
    }, 1000);
  }, [state, persistBlueprint]);

  // Action creators
  const updateLists = React.useCallback((lists: BlueprintList[]) => {
    dispatch({ type: 'UPDATE_LISTS', payload: lists });
    debouncedSave();
  }, [debouncedSave]);

  const addList = React.useCallback((list: BlueprintList) => {
    dispatch({ type: 'UPDATE_LISTS', payload: [...state.lists, list] });
    debouncedSave();
  }, [state.lists, debouncedSave]);

  const deleteList = React.useCallback((listId: string) => {
    dispatch({ type: 'UPDATE_LISTS', payload: state.lists.filter(list => list.id !== listId) });
    debouncedSave();
  }, [state.lists, debouncedSave]);

  const renameList = React.useCallback((listId: string, newName: string) => {
    const updatedLists = state.lists.map(list => 
      list.id === listId ? { ...list, name: newName } : list
    );
    dispatch({ type: 'UPDATE_LISTS', payload: updatedLists });
    debouncedSave();
  }, [state.lists, debouncedSave]);

  const updateCheckedItems = React.useCallback((listId: string, checkedItems: Record<string, boolean>) => {
    const updatedLists = state.lists.map(list => 
      list.id === listId ? { ...list, checkedItems } : list
    );
    dispatch({ type: 'UPDATE_LISTS', payload: updatedLists });
    debouncedSave();
  }, [state.lists, debouncedSave]);

  const updateShowDate = React.useCallback((date: string) => {
    dispatch({ type: 'UPDATE_SHOW_DATE', payload: date });
    debouncedSave();
  }, [debouncedSave]);

  const updateNotes = React.useCallback((notes: string) => {
    dispatch({ type: 'UPDATE_NOTES', payload: notes });
    debouncedSave();
  }, [debouncedSave]);

  const updateCrewData = React.useCallback((crewData: CrewMember[]) => {
    dispatch({ type: 'UPDATE_CREW_DATA', payload: crewData });
    debouncedSave();
  }, [debouncedSave]);

  const updateCameraPlots = React.useCallback((plots: CameraPlotScene[]) => {
    dispatch({ type: 'UPDATE_CAMERA_PLOTS', payload: plots });
    debouncedSave();
  }, [debouncedSave]);

  const updateComponentOrder = React.useCallback((order: string[]) => {
    dispatch({ type: 'UPDATE_COMPONENT_ORDER', payload: order });
    debouncedSave();
  }, [debouncedSave]);

  const saveBlueprint = React.useCallback(async () => {
    await debouncedSave();
  }, [debouncedSave]);

  const refreshBlueprint = React.useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const blueprintData = await loadBlueprint();
      
      if (blueprintData) {
        dispatch({ type: 'MERGE_REMOTE_STATE', payload: {
          lists: blueprintData.lists || [],
          showDate: blueprintData.show_date || '',
          notes: blueprintData.notes || '',
          crewData: blueprintData.crew_data || [],
          cameraPlots: blueprintData.camera_plots || [],
          componentOrder: blueprintData.component_order || ['crew-list', 'camera-plot', 'scratchpad']
        }});
      }
    } catch (error) {
      console.error('📋 Failed to refresh blueprint:', error);
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
    updateCrewData,
    updateCameraPlots,
    updateComponentOrder,
    saveBlueprint,
    refreshBlueprint
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
