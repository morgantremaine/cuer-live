import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { BlueprintList } from '@/types/blueprint';
import { CrewMember } from '@/types/crew';
import { CameraPlotScene } from '@/hooks/cameraPlot/core/useCameraPlotData';

export interface BlueprintData {
  lists: BlueprintList[];
  notes: string;
  crewData: CrewMember[];
  cameraPlots: CameraPlotScene[];
  showDate: string;
  componentOrder: string[];
}

export interface BlueprintDataManager {
  data: BlueprintData;
  isLoading: boolean;
  isInitialized: boolean;
  isSaving: boolean;
  
  // Core operations
  initialize: () => Promise<void>;
  save: (silent?: boolean) => Promise<void>;
  
  // List operations
  updateLists: (lists: BlueprintList[]) => void;
  addList: (name: string, sourceColumn: string, items: string[]) => void;
  deleteList: (listId: string) => void;
  renameList: (listId: string, newName: string) => void;
  updateListCheckedItems: (listId: string, checkedItems: Record<string, boolean>) => void;
  
  // Notes operations
  updateNotes: (notes: string) => void;
  
  // Crew operations
  updateCrewData: (crewData: CrewMember[]) => void;
  
  // Camera plot operations
  updateCameraPlots: (plots: CameraPlotScene[]) => void;
  
  // Other operations
  updateShowDate: (date: string) => void;
  updateComponentOrder: (order: string[]) => void;
}

export const useBlueprintDataManager = (
  rundownId: string,
  rundownTitle: string
): BlueprintDataManager => {
  const { user } = useAuth();
  
  // Core state
  const [data, setData] = useState<BlueprintData>({
    lists: [],
    notes: '',
    crewData: [],
    cameraPlots: [],
    showDate: new Date().toISOString().split('T')[0],
    componentOrder: ['crew-list', 'camera-plot', 'scratchpad']
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs for debouncing and preventing duplicate operations
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const initializationRef = useRef(false);
  const lastSaveDataRef = useRef<string>('');

  // Get team ID for the rundown
  const getTeamId = useCallback(async () => {
    if (!rundownId) return null;
    
    const { data: rundownData } = await supabase
      .from('rundowns')
      .select('team_id')
      .eq('id', rundownId)
      .single();
    
    return rundownData?.team_id || null;
  }, [rundownId]);

  // Load blueprint data from database
  const loadBlueprintData = useCallback(async (): Promise<BlueprintData | null> => {
    if (!user || !rundownId) return null;

    try {
      const teamId = await getTeamId();
      if (!teamId) return null;

      const { data: blueprintData, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('rundown_id', rundownId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!blueprintData) return null;

      return {
        lists: blueprintData.lists || [],
        notes: blueprintData.notes || '',
        crewData: blueprintData.crew_data || [],
        cameraPlots: blueprintData.camera_plots || [],
        showDate: blueprintData.show_date || new Date().toISOString().split('T')[0],
        componentOrder: blueprintData.component_order || ['crew-list', 'camera-plot', 'scratchpad']
      };
    } catch (error) {
      console.error('Error loading blueprint data:', error);
      return null;
    }
  }, [user, rundownId, getTeamId]);

  // Save blueprint data to database
  const saveBlueprintData = useCallback(async (dataToSave: BlueprintData) => {
    if (!user || !rundownId) return;

    try {
      const teamId = await getTeamId();
      if (!teamId) {
        console.error('Cannot save blueprint: no team_id found');
        return;
      }

      const blueprintData = {
        rundown_id: rundownId,
        rundown_title: rundownTitle || 'Untitled Rundown',
        user_id: user.id,
        team_id: teamId,
        lists: dataToSave.lists,
        notes: dataToSave.notes,
        crew_data: dataToSave.crewData,
        camera_plots: dataToSave.cameraPlots,
        show_date: dataToSave.showDate,
        component_order: dataToSave.componentOrder,
        updated_at: new Date().toISOString()
      };

      // Check if blueprint exists
      const { data: existingBlueprint } = await supabase
        .from('blueprints')
        .select('id')
        .eq('rundown_id', rundownId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (existingBlueprint) {
        // Update existing
        const { error } = await supabase
          .from('blueprints')
          .update(blueprintData)
          .eq('id', existingBlueprint.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('blueprints')
          .insert(blueprintData);

        if (error) throw error;
      }

      console.log('✅ Blueprint data saved successfully');
    } catch (error) {
      console.error('❌ Failed to save blueprint data:', error);
      throw error;
    }
  }, [user, rundownId, rundownTitle, getTeamId]);

  // Initialize blueprint data
  const initialize = useCallback(async () => {
    if (!user || !rundownId || isInitialized || initializationRef.current) {
      return;
    }

    initializationRef.current = true;
    setIsLoading(true);

    try {
      const loadedData = await loadBlueprintData();
      
      if (loadedData) {
        setData(loadedData);
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Blueprint initialization error:', error);
    } finally {
      setIsLoading(false);
      initializationRef.current = false;
    }
  }, [user, rundownId, isInitialized, loadBlueprintData]);

  // Debounced save function
  const save = useCallback(async (silent = false) => {
    if (!isInitialized) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Check if data has actually changed
    const currentDataString = JSON.stringify(data);
    if (currentDataString === lastSaveDataRef.current) {
      return;
    }

    setIsSaving(true);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveBlueprintData(data);
        lastSaveDataRef.current = currentDataString;
        
        if (!silent) {
          console.log('Blueprint saved');
        }
      } catch (error) {
        console.error('Failed to save blueprint:', error);
      } finally {
        setIsSaving(false);
      }
    }, silent ? 500 : 1000);
  }, [data, isInitialized, saveBlueprintData]);

  // Auto-save when data changes
  useEffect(() => {
    if (isInitialized) {
      save(true);
    }
  }, [data, isInitialized, save]);

  // List operations
  const updateLists = useCallback((lists: BlueprintList[]) => {
    setData(prev => ({ ...prev, lists }));
  }, []);

  const addList = useCallback((name: string, sourceColumn: string, items: string[]) => {
    const newList: BlueprintList = {
      id: `${sourceColumn}_${Date.now()}_${Math.random()}`,
      name,
      sourceColumn,
      items,
      checkedItems: {}
    };
    
    setData(prev => ({ 
      ...prev, 
      lists: [...prev.lists, newList] 
    }));
  }, []);

  const deleteList = useCallback((listId: string) => {
    setData(prev => ({
      ...prev,
      lists: prev.lists.filter(list => list.id !== listId)
    }));
  }, []);

  const renameList = useCallback((listId: string, newName: string) => {
    setData(prev => ({
      ...prev,
      lists: prev.lists.map(list => 
        list.id === listId ? { ...list, name: newName } : list
      )
    }));
  }, []);

  const updateListCheckedItems = useCallback((listId: string, checkedItems: Record<string, boolean>) => {
    setData(prev => ({
      ...prev,
      lists: prev.lists.map(list => 
        list.id === listId ? { ...list, checkedItems } : list
      )
    }));
  }, []);

  // Notes operations
  const updateNotes = useCallback((notes: string) => {
    setData(prev => ({ ...prev, notes }));
  }, []);

  // Crew operations
  const updateCrewData = useCallback((crewData: CrewMember[]) => {
    setData(prev => ({ ...prev, crewData }));
  }, []);

  // Camera plot operations
  const updateCameraPlots = useCallback((cameraPlots: CameraPlotScene[]) => {
    setData(prev => ({ ...prev, cameraPlots }));
  }, []);

  // Other operations
  const updateShowDate = useCallback((showDate: string) => {
    setData(prev => ({ ...prev, showDate }));
  }, []);

  const updateComponentOrder = useCallback((componentOrder: string[]) => {
    setData(prev => ({ ...prev, componentOrder }));
  }, []);

  // Auto-initialize
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    isInitialized,
    isSaving,
    initialize,
    save,
    updateLists,
    addList,
    deleteList,
    renameList,
    updateListCheckedItems,
    updateNotes,
    updateCrewData,
    updateCameraPlots,
    updateShowDate,
    updateComponentOrder
  };
};
