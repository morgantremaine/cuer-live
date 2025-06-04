
import { useState, useCallback, useEffect, useRef } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn } from '@/utils/blueprintUtils';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useBlueprintState = (rundownId: string, rundownTitle: string, items: RundownItem[]) => {
  console.log('🚀 CORE BLUEPRINT STATE HOOK CALLED:', { rundownId, rundownTitle, itemsLength: items.length });
  
  const [lists, setLists] = useState<BlueprintList[]>([]);
  const [showDate, setShowDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State tracking with a single ref
  const stateRef = useRef({
    currentRundownId: '',
    isInitializing: false,
    isSaving: false,
    savedBlueprint: null as any,
    hasLoadedOnce: false
  });

  console.log('🚀 CORE STATE:', { 
    listsCount: lists.length, 
    initialized, 
    loading,
    currentRundownId: stateRef.current.currentRundownId,
    isInitializing: stateRef.current.isInitializing
  });

  // Generate list ID
  const generateListId = useCallback((sourceColumn: string) => {
    return `${sourceColumn}_${Date.now()}_${Math.random()}`;
  }, []);

  // Load blueprint from database
  const loadBlueprint = useCallback(async () => {
    if (!user || !rundownId) {
      console.log('🚀 Cannot load - missing user or rundownId');
      return null;
    }

    console.log('🚀 Loading blueprint from database for:', rundownId);
    
    try {
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (error) {
        console.error('🚀 Error loading blueprint:', error);
        return null;
      }

      console.log('🚀 Loaded blueprint:', data ? `${data.lists?.length || 0} lists` : 'none');
      stateRef.current.savedBlueprint = data;
      return data;
    } catch (error) {
      console.error('🚀 Exception loading blueprint:', error);
      return null;
    }
  }, [user, rundownId]);

  // Save blueprint to database
  const saveBlueprint = useCallback(async (updatedLists: BlueprintList[], silent = false) => {
    if (!user || !rundownId || stateRef.current.isSaving) {
      console.log('🚀 Cannot save - missing user, rundownId, or already saving');
      return;
    }

    console.log('🚀 Saving blueprint with', updatedLists.length, 'lists');
    stateRef.current.isSaving = true;

    try {
      const blueprintData = {
        user_id: user.id,
        rundown_id: rundownId,
        rundown_title: rundownTitle,
        lists: updatedLists,
        show_date: showDate,
        updated_at: new Date().toISOString()
      };

      let result;
      
      if (stateRef.current.savedBlueprint) {
        const { data, error } = await supabase
          .from('blueprints')
          .update(blueprintData)
          .eq('id', stateRef.current.savedBlueprint.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
        console.log('🚀 Updated blueprint successfully');
      } else {
        const { data, error } = await supabase
          .from('blueprints')
          .insert(blueprintData)
          .select()
          .single();

        if (error) throw error;
        result = data;
        console.log('🚀 Created blueprint successfully');
      }
      
      stateRef.current.savedBlueprint = result;

      if (!silent) {
        toast({
          title: 'Success',
          description: 'Blueprint saved successfully!',
        });
      }
      
      return result;
    } catch (error) {
      console.error('🚀 Save error:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to save blueprint',
          variant: 'destructive',
        });
      }
    } finally {
      stateRef.current.isSaving = false;
    }
  }, [user, rundownId, rundownTitle, showDate, toast]);

  // Initialize blueprint
  const initializeBlueprint = useCallback(async () => {
    // Prevent multiple initializations
    if (stateRef.current.isInitializing || 
        stateRef.current.currentRundownId === rundownId ||
        !user || !rundownId || !rundownTitle || items.length === 0) {
      console.log('🚀 Skipping initialization - already done or missing data');
      return;
    }

    console.log('🚀 STARTING initialization for:', rundownId);
    stateRef.current.isInitializing = true;
    stateRef.current.currentRundownId = rundownId;
    setLoading(true);

    try {
      const blueprintData = await loadBlueprint();
      
      if (blueprintData && blueprintData.lists && blueprintData.lists.length > 0) {
        console.log('🚀 Using saved blueprint with', blueprintData.lists.length, 'lists');
        
        const refreshedLists = blueprintData.lists.map((list: BlueprintList) => ({
          ...list,
          items: generateListFromColumn(items, list.sourceColumn),
          checkedItems: list.checkedItems || {}
        }));
        
        setLists(refreshedLists);
        
        if (blueprintData.show_date) {
          setShowDate(blueprintData.show_date);
        }
      } else {
        console.log('🚀 Creating default blueprint');
        const defaultLists = [
          {
            id: generateListId('headers'),
            name: 'Rundown Overview',
            sourceColumn: 'headers',
            items: generateListFromColumn(items, 'headers'),
            checkedItems: {}
          }
        ];
        setLists(defaultLists);
        
        // Save the default list
        await saveBlueprint(defaultLists, true);
      }
      
      setInitialized(true);
      console.log('🚀 COMPLETED initialization for:', rundownId);
    } catch (error) {
      console.error('🚀 Initialization error:', error);
    } finally {
      setLoading(false);
      stateRef.current.isInitializing = false;
    }
  }, [user, rundownId, rundownTitle, items, generateListId, saveBlueprint, loadBlueprint]);

  // Initialize when conditions are met - simplified effect
  useEffect(() => {
    console.log('🚀 Effect triggered with:', { 
      rundownId, 
      currentRundownId: stateRef.current.currentRundownId,
      itemsLength: items.length,
      initialized,
      loading,
      user: !!user
    });

    // Reset if rundown changed
    if (rundownId !== stateRef.current.currentRundownId && stateRef.current.currentRundownId !== '') {
      console.log('🚀 Rundown changed - resetting');
      setLists([]);
      setInitialized(false);
      stateRef.current.savedBlueprint = null;
      stateRef.current.currentRundownId = '';
      stateRef.current.isInitializing = false;
    }
    
    // Initialize if needed
    if (user && rundownId && rundownTitle && items.length > 0 && !initialized && !loading && !stateRef.current.isInitializing) {
      console.log('🚀 Calling initializeBlueprint');
      initializeBlueprint();
    }
  }, [user, rundownId, rundownTitle, items.length, initialized, loading, initializeBlueprint]);

  // Checkbox update handler with immediate state update
  const updateCheckedItems = useCallback((listId: string, checkedItems: Record<string, boolean>) => {
    console.log('🚀 Updating checked items for list:', listId);
    
    // Update state immediately
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, checkedItems } : list
      );
      
      // Debounced save
      setTimeout(() => {
        saveBlueprint(updatedLists, true);
      }, 500);
      
      return updatedLists;
    });
  }, [saveBlueprint]);

  const addNewList = useCallback(async (name: string, sourceColumn: string) => {
    console.log('🚀 Adding new list:', name, 'for column:', sourceColumn);
    
    const newList: BlueprintList = {
      id: generateListId(sourceColumn),
      name,
      sourceColumn,
      items: generateListFromColumn(items, sourceColumn),
      checkedItems: {}
    };
    
    // Update state immediately
    setLists(currentLists => {
      const updatedLists = [...currentLists, newList];
      
      // Save asynchronously
      saveBlueprint(updatedLists, false);
      
      return updatedLists;
    });
  }, [items, generateListId, saveBlueprint]);

  const deleteList = useCallback(async (listId: string) => {
    setLists(currentLists => {
      const updatedLists = currentLists.filter(list => list.id !== listId);
      saveBlueprint(updatedLists, false);
      return updatedLists;
    });
  }, [saveBlueprint]);

  const renameList = useCallback(async (listId: string, newName: string) => {
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => {
        if (list.id === listId) {
          return { ...list, name: newName };
        }
        return list;
      });
      saveBlueprint(updatedLists, true);
      return updatedLists;
    });
  }, [saveBlueprint]);

  const refreshAllLists = useCallback(async () => {
    setLists(currentLists => {
      const refreshedLists = currentLists.map(list => ({
        ...list,
        items: generateListFromColumn(items, list.sourceColumn)
      }));
      saveBlueprint(refreshedLists, true);
      return refreshedLists;
    });
  }, [items, saveBlueprint]);

  const updateShowDate = useCallback(async (newDate: string) => {
    setShowDate(newDate);
    await saveBlueprint(lists, true);
  }, [lists, saveBlueprint]);

  return {
    lists,
    showDate,
    initialized,
    loading,
    updateCheckedItems,
    addNewList,
    deleteList,
    renameList,
    refreshAllLists,
    updateShowDate
  };
};
