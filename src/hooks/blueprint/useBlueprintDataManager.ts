
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
  
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs for debouncing and preventing duplicate operations
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const initializationRef = useRef(false);
  const lastSaveDataRef = useRef<string>('');
  const mountedRef = useRef(true);

  console.log('🔵 BlueprintDataManager: Hook called for rundown:', rundownId, 'initialized:', isInitialized);

  // Get team ID for the rundown
  const getTeamId = useCallback(async () => {
    if (!rundownId) return null;
    
    console.log('🔍 Getting team ID for rundown:', rundownId);
    
    const { data: rundownData, error } = await supabase
      .from('rundowns')
      .select('team_id')
      .eq('id', rundownId)
      .single();
    
    if (error) {
      console.error('❌ Error getting team ID:', error);
      return null;
    }
    
    console.log('✅ Found team ID:', rundownData?.team_id);
    return rundownData?.team_id || null;
  }, [rundownId]);

  // Load blueprint data from database
  const loadBlueprintData = useCallback(async (): Promise<BlueprintData | null> => {
    if (!user || !rundownId) {
      console.log('⏭️ Skipping load - no user or rundown ID');
      return null;
    }

    console.log('📥 Loading blueprint data for rundown:', rundownId);

    try {
      const teamId = await getTeamId();
      if (!teamId) {
        console.log('⏭️ No team ID found, cannot load blueprint');
        return null;
      }

      const { data: blueprintData, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('rundown_id', rundownId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error loading blueprint:', error);
        throw error;
      }

      if (!blueprintData) {
        console.log('📝 No existing blueprint found');
        return null;
      }

      console.log('✅ Loaded blueprint data:', {
        lists: blueprintData.lists?.length || 0,
        crewData: blueprintData.crew_data?.length || 0,
        notes: blueprintData.notes ? 'present' : 'empty',
        showDate: blueprintData.show_date
      });

      return {
        lists: blueprintData.lists || [],
        notes: blueprintData.notes || '',
        crewData: blueprintData.crew_data || [],
        cameraPlots: blueprintData.camera_plots || [],
        showDate: blueprintData.show_date || new Date().toISOString().split('T')[0],
        componentOrder: blueprintData.component_order || ['crew-list', 'camera-plot', 'scratchpad']
      };
    } catch (error) {
      console.error('❌ Error loading blueprint data:', error);
      return null;
    }
  }, [user, rundownId, getTeamId]);

  // Save blueprint data to database
  const saveBlueprintData = useCallback(async (dataToSave: BlueprintData) => {
    if (!user || !rundownId || !mountedRef.current) {
      console.log('⏭️ Skipping save - no user, rundown ID, or component unmounted');
      return;
    }

    console.log('💾 Saving blueprint data:', {
      lists: dataToSave.lists.length,
      crewData: dataToSave.crewData.length,
      notes: dataToSave.notes ? 'present' : 'empty',
      showDate: dataToSave.showDate
    });

    try {
      const teamId = await getTeamId();
      if (!teamId) {
        console.error('❌ Cannot save blueprint: no team_id found');
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

        if (error) {
          console.error('❌ Error updating blueprint:', error);
          throw error;
        }
        console.log('✅ Blueprint updated successfully');
      } else {
        // Insert new
        const { error } = await supabase
          .from('blueprints')
          .insert(blueprintData);

        if (error) {
          console.error('❌ Error inserting blueprint:', error);
          throw error;
        }
        console.log('✅ Blueprint created successfully');
      }
    } catch (error) {
      console.error('❌ Failed to save blueprint data:', error);
      throw error;
    }
  }, [user, rundownId, rundownTitle, getTeamId]);

  // Initialize blueprint data
  const initialize = useCallback(async () => {
    if (!user || !rundownId || isInitialized || initializationRef.current) {
      console.log('⏭️ Skipping initialization - already initialized or missing data');
      return;
    }

    console.log('🚀 Initializing blueprint data manager');
    initializationRef.current = true;
    setIsLoading(true);

    try {
      const loadedData = await loadBlueprintData();
      
      if (loadedData) {
        console.log('📥 Setting loaded data');
        setData(loadedData);
      } else {
        console.log('📝 No existing data, using defaults with initial crew members');
        // Initialize with default crew members if no data exists
        const defaultCrewMembers = Array.from({ length: 5 }, (_, index) => ({
          id: `crew-${index + 1}`,
          role: '',
          name: '',
          phone: '',
          email: ''
        }));
        
        setData(prev => ({
          ...prev,
          crewData: defaultCrewMembers
        }));
      }
      
      setIsInitialized(true);
      console.log('✅ Blueprint initialization complete');
    } catch (error) {
      console.error('❌ Blueprint initialization error:', error);
    } finally {
      setIsLoading(false);
      initializationRef.current = false;
    }
  }, [user, rundownId, isInitialized, loadBlueprintData]);

  // Debounced save function
  const save = useCallback(async (silent = false) => {
    if (!isInitialized || !mountedRef.current) {
      console.log('⏭️ Skipping save - not initialized or unmounted');
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Check if data has actually changed
    const currentDataString = JSON.stringify(data);
    if (currentDataString === lastSaveDataRef.current) {
      console.log('⏭️ Skipping save - no changes detected');
      return;
    }

    console.log('💾 Scheduling blueprint save, silent:', silent);

    if (!silent) {
      setIsSaving(true);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      
      try {
        await saveBlueprintData(data);
        lastSaveDataRef.current = currentDataString;
        
        if (!silent) {
          console.log('✅ Blueprint saved successfully');
        }
      } catch (error) {
        console.error('❌ Failed to save blueprint:', error);
      } finally {
        if (!silent && mountedRef.current) {
          setIsSaving(false);
        }
      }
    }, silent ? 300 : 1000);
  }, [data, isInitialized, saveBlueprintData]);

  // Auto-save when data changes
  useEffect(() => {
    if (isInitialized && mountedRef.current) {
      console.log('🔄 Data changed, triggering auto-save');
      save(true);
    }
  }, [data, isInitialized, save]);

  // List operations
  const updateLists = useCallback((lists: BlueprintList[]) => {
    console.log('📝 Updating lists:', lists.length);
    setData(prev => ({ ...prev, lists }));
  }, []);

  const addList = useCallback((name: string, sourceColumn: string, items: string[]) => {
    console.log('➕ Adding list:', name, 'with', items.length, 'items');
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
    console.log('🗑️ Deleting list:', listId);
    setData(prev => ({
      ...prev,
      lists: prev.lists.filter(list => list.id !== listId)
    }));
  }, []);

  const renameList = useCallback((listId: string, newName: string) => {
    console.log('✏️ Renaming list:', listId, 'to:', newName);
    setData(prev => ({
      ...prev,
      lists: prev.lists.map(list => 
        list.id === listId ? { ...list, name: newName } : list
      )
    }));
  }, []);

  const updateListCheckedItems = useCallback((listId: string, checkedItems: Record<string, boolean>) => {
    console.log('✅ Updating checked items for list:', listId, checkedItems);
    setData(prev => ({
      ...prev,
      lists: prev.lists.map(list => 
        list.id === listId ? { ...list, checkedItems } : list
      )
    }));
  }, []);

  // Notes operations
  const updateNotes = useCallback((notes: string) => {
    console.log('📝 Updating notes, length:', notes.length);
    setData(prev => ({ ...prev, notes }));
  }, []);

  // Crew operations
  const updateCrewData = useCallback((crewData: CrewMember[]) => {
    console.log('👥 Updating crew data:', crewData.length, 'members');
    setData(prev => ({ ...prev, crewData }));
  }, []);

  // Camera plot operations
  const updateCameraPlots = useCallback((cameraPlots: CameraPlotScene[]) => {
    console.log('📹 Updating camera plots:', cameraPlots.length, 'plots');
    setData(prev => ({ ...prev, cameraPlots }));
  }, []);

  // Other operations
  const updateShowDate = useCallback((showDate: string) => {
    console.log('📅 Updating show date:', showDate);
    setData(prev => ({ ...prev, showDate }));
  }, []);

  const updateComponentOrder = useCallback((componentOrder: string[]) => {
    console.log('🔄 Updating component order:', componentOrder);
    setData(prev => ({ ...prev, componentOrder }));
  }, []);

  // Auto-initialize
  useEffect(() => {
    console.log('🔄 Effect: Auto-initialize triggered');
    initialize();
  }, [initialize]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      console.log('🧹 Blueprint data manager cleanup');
      mountedRef.current = false;
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
