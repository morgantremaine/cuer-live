import { useState, useCallback, useEffect, useRef } from 'react';
import { useBlueprintSync } from './useBlueprintSync';
import { BlueprintList } from '@/types/blueprint';
import { CameraPlotScene } from '@/hooks/cameraPlot/core/useCameraPlotData';

interface BlueprintState {
  lists: BlueprintList[];
  showDate: string;
  notes: string;
  cameraPlots: CameraPlotScene[];
  componentOrder: string[];
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastChanged: number;
}

const initialState: BlueprintState = {
  lists: [],
  showDate: '',
  notes: '',
  cameraPlots: [],
  componentOrder: ['camera-plot', 'scratchpad'],
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,
  lastChanged: 0
};

export const useBulletproofBlueprintState = (rundownId: string | null) => {
  const [state, setState] = useState<BlueprintState>(initialState);
  const [isInitialized, setIsInitialized] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationRef = useRef(false);

  // Enhanced data sync with conflict resolution
  const {
    syncWithServer,
    saveToServer,
    trackOfflineChange,
    forceFocusCheck,
    isConnected,
    connectionType,
    hasOfflineChanges,
    isSyncing
  } = useBlueprintSync(
    rundownId,
    state,
    (newStateData) => {
      setState(prev => ({
        ...prev,
        ...newStateData,
        hasUnsavedChanges: false
      }));
    },
    (mergedData) => {
      console.log('🔀 Blueprint conflict resolved with merged data');
    }
  );

  // Auto-save with offline queueing and better debouncing
  const autoSave = useCallback(async () => {
    if (!isInitialized || !state.hasUnsavedChanges) return;

    console.log('🔄 Auto-saving blueprint data...');
    setState(prev => ({ ...prev, isSaving: true }));
    
    const success = await saveToServer();
    
    setState(prev => ({
      ...prev,
      isSaving: false,
      hasUnsavedChanges: success ? false : prev.hasUnsavedChanges
    }));

    if (success) {
      console.log('✅ Blueprint auto-save completed successfully');
    } else {
      console.log('❌ Blueprint auto-save failed - will retry with offline queue');
    }
  }, [isInitialized, state.hasUnsavedChanges, saveToServer]);

  // Debounced auto-save trigger
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(autoSave, 1500);
  }, [autoSave]);

  // Mark state as changed
  const markChanged = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasUnsavedChanges: true,
      lastChanged: Date.now()
    }));
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Enhanced field change tracking with offline support
  const handleFieldChange = useCallback((fieldKey: string, value: any) => {
    // Track offline changes when not connected
    trackOfflineChange(fieldKey, value);
    
    // Apply change locally immediately for responsive UX
    setState(prev => {
      const newState = { ...prev };
      
      if (fieldKey === 'lists') {
        newState.lists = value;
      } else if (fieldKey === 'showDate') {
        newState.showDate = value;
      } else if (fieldKey === 'notes') {
        newState.notes = value;
      } else if (fieldKey === 'cameraPlots') {
        newState.cameraPlots = value;
      } else if (fieldKey === 'componentOrder') {
        newState.componentOrder = value;
      }
      
      return {
        ...newState,
        hasUnsavedChanges: true,
        lastChanged: Date.now()
      };
    });

    triggerAutoSave();
  }, [trackOfflineChange, triggerAutoSave]);

  // Initialize blueprint data
  const initializeBlueprint = useCallback(async () => {
    if (initializationRef.current || !rundownId) return;
    initializationRef.current = true;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Sync with server to get latest data
      await syncWithServer(true);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize blueprint:', error);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
      initializationRef.current = false;
    }
  }, [rundownId, syncWithServer]);

  // Initialize on mount
  useEffect(() => {
    initializeBlueprint();
  }, [initializeBlueprint]);

  // Enhanced focus check with conflict resolution
  const handleTabFocus = useCallback(() => {
    if (isInitialized && isConnected) {
      console.log('👁️ Blueprint tab focused - checking for updates...');
      forceFocusCheck();
    }
  }, [isInitialized, isConnected, forceFocusCheck]);

  // Set up focus listeners
  useEffect(() => {
    window.addEventListener('focus', handleTabFocus);
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleTabFocus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleTabFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleTabFocus]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Blueprint-specific actions
  const updateLists = useCallback((lists: BlueprintList[]) => {
    handleFieldChange('lists', lists);
  }, [handleFieldChange]);

  const updateShowDate = useCallback((date: string) => {
    handleFieldChange('showDate', date);
  }, [handleFieldChange]);

  const updateNotes = useCallback((notes: string) => {
    handleFieldChange('notes', notes);
  }, [handleFieldChange]);

  const updateCameraPlots = useCallback((plots: CameraPlotScene[]) => {
    handleFieldChange('cameraPlots', plots);
  }, [handleFieldChange]);

  const updateComponentOrder = useCallback((order: string[]) => {
    handleFieldChange('componentOrder', order);
  }, [handleFieldChange]);

  return {
    // Core state
    ...state,
    
    // Status
    isInitialized,
    isSaving: state.isSaving || isSyncing,
    
    // Network and sync status
    isConnected,
    connectionType,
    hasOfflineChanges,
    
    // Actions
    updateLists,
    updateShowDate,
    updateNotes,
    updateCameraPlots,
    updateComponentOrder,
    handleFieldChange,
    markChanged,
    forceFocusCheck,
    
    // Manual sync control
    syncNow: () => syncWithServer(true),
    saveNow: autoSave,
    triggerAutoSave
  };
};