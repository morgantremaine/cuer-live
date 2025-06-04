
import { useState, useCallback, useEffect, useRef } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn } from '@/utils/blueprintUtils';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface BlueprintData {
  lists: BlueprintList[];
  show_date?: string;
}

export const useBlueprintState = (rundownId: string, rundownTitle: string, items: RundownItem[]) => {
  const [lists, setLists] = useState<BlueprintList[]>([]);
  const [showDate, setShowDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Single state tracker to prevent loops
  const stateRef = useRef({
    currentRundownId: '',
    isInitializing: false,
    isSaving: false,
    savedBlueprint: null as any
  });

  // Generate consistent list ID
  const generateListId = useCallback((sourceColumn: string) => {
    const timestamp = Date.now();
    const random = Math.random();
    return `${sourceColumn}_${timestamp}_${random}`;
  }, []);

  // Save function with proper deduplication
  const saveBlueprint = useCallback(async (updatedLists: BlueprintList[], silent = false) => {
    if (!user || !rundownId || stateRef.current.isSaving) {
      console.log('Blueprint save: Cannot save - missing user, rundownId, or already saving');
      return;
    }

    console.log('Blueprint save: Saving', updatedLists.length, 'lists', silent ? '(silent)' : '');
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
        console.log('Blueprint save: Updated successfully');
      } else {
        const { data, error } = await supabase
          .from('blueprints')
          .insert(blueprintData)
          .select()
          .single();

        if (error) throw error;
        result = data;
        console.log('Blueprint save: Created successfully');
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
      console.error('Blueprint save: Error:', error);
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

  // Initialize blueprint data - called only once per rundown
  const initializeBlueprint = useCallback(async () => {
    if (!user || !rundownId || !rundownTitle || items.length === 0) {
      console.log('Blueprint init: Missing requirements');
      return;
    }

    if (stateRef.current.isInitializing || stateRef.current.currentRundownId === rundownId) {
      console.log('Blueprint init: Already initialized or initializing');
      return;
    }

    console.log('Blueprint init: Starting for rundown:', rundownId);
    stateRef.current.isInitializing = true;
    stateRef.current.currentRundownId = rundownId;
    setLoading(true);

    try {
      // Load existing blueprint
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (error) {
        console.error('Blueprint init: Error loading:', error);
        return;
      }

      if (data && data.lists && data.lists.length > 0) {
        console.log('Blueprint init: Using saved blueprint with', data.lists.length, 'lists');
        
        // Refresh items but preserve checkbox states
        const refreshedLists = data.lists.map((list: BlueprintList) => ({
          ...list,
          items: generateListFromColumn(items, list.sourceColumn),
          checkedItems: list.checkedItems || {}
        }));
        
        setLists(refreshedLists);
        stateRef.current.savedBlueprint = data;
        
        if (data.show_date) {
          setShowDate(data.show_date);
        }
      } else {
        console.log('Blueprint init: Creating default blueprint');
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
      console.log('Blueprint init: Completed for rundown:', rundownId);
    } catch (error) {
      console.error('Blueprint init: Error:', error);
    } finally {
      setLoading(false);
      stateRef.current.isInitializing = false;
    }
  }, [user, rundownId, rundownTitle, items, generateListId, saveBlueprint]);

  // Initialize when conditions are met
  useEffect(() => {
    if (rundownId !== stateRef.current.currentRundownId) {
      console.log('Blueprint: Rundown changed, resetting');
      setLists([]);
      setInitialized(false);
      stateRef.current.savedBlueprint = null;
      stateRef.current.currentRundownId = '';
      stateRef.current.isInitializing = false;
    }
    
    if (user && rundownId && rundownTitle && items.length > 0 && !initialized && !loading) {
      initializeBlueprint();
    }
  }, [user, rundownId, rundownTitle, items.length, initialized, loading, initializeBlueprint]);

  // Checkbox update handler
  const updateCheckedItems = useCallback((listId: string, checkedItems: Record<string, boolean>) => {
    console.log('Blueprint: updating checked items for list:', listId);
    
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
    if (stateRef.current.isSaving) {
      console.log('Blueprint: Cannot add list while saving');
      return;
    }
    
    console.log('Blueprint: Adding new list:', name, 'for column:', sourceColumn);
    
    const newList: BlueprintList = {
      id: generateListId(sourceColumn),
      name,
      sourceColumn,
      items: generateListFromColumn(items, sourceColumn),
      checkedItems: {}
    };
    
    const updatedLists = [...lists, newList];
    setLists(updatedLists);
    
    // Save immediately
    await saveBlueprint(updatedLists, false);
    console.log('Blueprint: New list saved');
  }, [lists, items, generateListId, saveBlueprint]);

  const deleteList = useCallback(async (listId: string) => {
    const updatedLists = lists.filter(list => list.id !== listId);
    setLists(updatedLists);
    await saveBlueprint(updatedLists, false);
  }, [lists, saveBlueprint]);

  const renameList = useCallback(async (listId: string, newName: string) => {
    const updatedLists = lists.map(list => {
      if (list.id === listId) {
        return { ...list, name: newName };
      }
      return list;
    });
    setLists(updatedLists);
    await saveBlueprint(updatedLists, true);
  }, [lists, saveBlueprint]);

  const refreshAllLists = useCallback(async () => {
    const refreshedLists = lists.map(list => ({
      ...list,
      items: generateListFromColumn(items, list.sourceColumn)
    }));
    setLists(refreshedLists);
    await saveBlueprint(refreshedLists, true);
  }, [lists, items, saveBlueprint]);

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
