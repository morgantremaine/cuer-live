
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn, getAvailableColumns } from '@/utils/blueprintUtils';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useBlueprintState = (rundownId: string, rundownTitle: string, items: RundownItem[], rundownStartTime?: string) => {
  const [lists, setLists] = useState<BlueprintList[]>([]);
  const [showDate, setShowDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const [savedBlueprint, setSavedBlueprint] = useState<any>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const stateRef = useRef({
    currentRundownId: '',
    isInitializing: false
  });

  const availableColumns = useMemo(() => getAvailableColumns(items), [items]);

  // Generate list ID
  const generateListId = useCallback((sourceColumn: string) => {
    return `${sourceColumn}_${Date.now()}_${Math.random()}`;
  }, []);

  // Load blueprint from database
  const loadBlueprint = useCallback(async () => {
    if (!user || !rundownId) return null;
    
    try {
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (error) {
        console.error('Blueprint load error:', error);
        return null;
      }

      setSavedBlueprint(data);
      return data;
    } catch (error) {
      console.error('Blueprint load exception:', error);
      return null;
    }
  }, [user, rundownId]);

  // Save blueprint to database
  const saveBlueprint = useCallback(async (updatedLists: BlueprintList[], silent = false) => {
    if (!user || !rundownId) return;

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
      
      if (savedBlueprint) {
        const { data, error } = await supabase
          .from('blueprints')
          .update(blueprintData)
          .eq('id', savedBlueprint.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('blueprints')
          .insert(blueprintData)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }
      
      setSavedBlueprint(result);

      if (!silent) {
        toast({
          title: 'Success',
          description: 'Blueprint saved successfully!',
        });
      }
    } catch (error) {
      console.error('Blueprint save error:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to save blueprint',
          variant: 'destructive',
        });
      }
    }
  }, [user, rundownId, rundownTitle, showDate, savedBlueprint, toast]);

  // Initialize blueprint
  useEffect(() => {
    // Reset if rundown changed
    if (rundownId !== stateRef.current.currentRundownId && stateRef.current.currentRundownId !== '') {
      setLists([]);
      setInitialized(false);
      setSavedBlueprint(null);
      stateRef.current.currentRundownId = '';
      stateRef.current.isInitializing = false;
    }
    
    // Initialize if needed
    if (user && rundownId && rundownTitle && items.length > 0 && !initialized && !loading && !stateRef.current.isInitializing) {
      stateRef.current.isInitializing = true;
      stateRef.current.currentRundownId = rundownId;
      setLoading(true);

      const initializeBlueprint = async () => {
        try {
          const blueprintData = await loadBlueprint();
          
          if (blueprintData && blueprintData.lists && blueprintData.lists.length > 0) {
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
            await saveBlueprint(defaultLists, true);
          }
          
          setInitialized(true);
        } catch (error) {
          console.error('Blueprint initialization error:', error);
        } finally {
          setLoading(false);
          stateRef.current.isInitializing = false;
        }
      };

      initializeBlueprint();
    }
  }, [user, rundownId, rundownTitle, items.length, initialized, loading, loadBlueprint, saveBlueprint, generateListId]);

  // Update checked items
  const updateCheckedItems = useCallback((listId: string, checkedItems: Record<string, boolean>) => {
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, checkedItems } : list
      );
      
      // Save silently after a delay
      setTimeout(() => {
        saveBlueprint(updatedLists, true);
      }, 500);
      
      return updatedLists;
    });
  }, [saveBlueprint]);

  // Add new list
  const addNewList = useCallback((name: string, sourceColumn: string) => {
    const newList: BlueprintList = {
      id: generateListId(sourceColumn),
      name,
      sourceColumn,
      items: generateListFromColumn(items, sourceColumn),
      checkedItems: {}
    };
    
    setLists(currentLists => {
      const updatedLists = [...currentLists, newList];
      saveBlueprint(updatedLists, false);
      return updatedLists;
    });
  }, [items, generateListId, saveBlueprint]);

  // Delete list
  const deleteList = useCallback((listId: string) => {
    setLists(currentLists => {
      const updatedLists = currentLists.filter(list => list.id !== listId);
      saveBlueprint(updatedLists, false);
      return updatedLists;
    });
  }, [saveBlueprint]);

  // Rename list
  const renameList = useCallback((listId: string, newName: string) => {
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, name: newName } : list
      );
      saveBlueprint(updatedLists, true);
      return updatedLists;
    });
  }, [saveBlueprint]);

  // Refresh all lists
  const refreshAllLists = useCallback(() => {
    setLists(currentLists => {
      const refreshedLists = currentLists.map(list => ({
        ...list,
        items: generateListFromColumn(items, list.sourceColumn)
      }));
      saveBlueprint(refreshedLists, true);
      return refreshedLists;
    });
  }, [items, saveBlueprint]);

  // Update show date
  const updateShowDate = useCallback((newDate: string) => {
    setShowDate(newDate);
    setTimeout(() => {
      saveBlueprint(lists, true);
    }, 100);
  }, [lists, saveBlueprint]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, listId: string) => {
    setDraggedListId(listId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', listId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnterContainer = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedListId) {
      const draggedIndex = lists.findIndex(list => list.id === draggedListId);
      
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseY = e.clientY;
      const elementCenter = rect.top + rect.height / 2;
      
      let targetIndex = index;
      if (mouseY > elementCenter) {
        targetIndex = index + 1;
      }
      
      if (draggedIndex !== -1 && draggedIndex < targetIndex) {
        targetIndex -= 1;
      }
      
      setInsertionIndex(targetIndex);
    }
  }, [draggedListId, lists]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const container = document.querySelector('[data-drop-container]');
    if (container && !container.contains(e.relatedTarget as Node)) {
      setInsertionIndex(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || insertionIndex === null) {
      setDraggedListId(null);
      setInsertionIndex(null);
      return;
    }

    const draggedIndex = lists.findIndex(list => list.id === draggedId);
    if (draggedIndex === -1) {
      setDraggedListId(null);
      setInsertionIndex(null);
      return;
    }

    setLists(currentLists => {
      const newLists = [...currentLists];
      const [draggedList] = newLists.splice(draggedIndex, 1);
      newLists.splice(insertionIndex, 0, draggedList);
      saveBlueprint(newLists, true);
      return newLists;
    });

    setDraggedListId(null);
    setInsertionIndex(null);
  }, [lists, insertionIndex, saveBlueprint]);

  const handleDragEnd = useCallback(() => {
    setDraggedListId(null);
    setInsertionIndex(null);
  }, []);

  return {
    lists,
    availableColumns,
    showDate,
    initialized,
    loading,
    updateShowDate,
    addNewList,
    deleteList,
    renameList,
    updateCheckedItems,
    refreshAllLists,
    draggedListId,
    insertionIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    savedBlueprint
  };
};
