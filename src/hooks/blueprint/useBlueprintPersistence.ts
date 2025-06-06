
import { useCallback, useRef } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useBlueprintPersistence = (
  rundownId: string,
  rundownTitle: string,
  showDate: string,
  savedBlueprint: any,
  setSavedBlueprint: (blueprint: any) => void
) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const saveInProgressRef = useRef(false);
  const saveQueueRef = useRef<any>(null);

  const loadBlueprint = useCallback(async () => {
    if (!user || !rundownId) {
      console.log('Cannot load blueprint: missing user or rundownId');
      return null;
    }
    
    try {
      console.log('Loading blueprint for rundown:', rundownId, 'user:', user.id);
      
      // Get the most recent blueprint for this rundown and user
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('rundown_id', rundownId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading blueprint:', error);
        return null;
      }

      if (data) {
        console.log('Loaded blueprint data:', data.id);
        setSavedBlueprint(data);
      }
      return data;
    } catch (error) {
      console.error('Exception loading blueprint:', error);
      return null;
    }
  }, [user, rundownId, setSavedBlueprint]);

  const saveBlueprint = useCallback(async (
    updatedLists: BlueprintList[], 
    silent = false, 
    showDateOverride?: string,
    notes?: string,
    crewData?: any[],
    cameraPlots?: any[]
  ) => {
    if (!user || !rundownId) {
      console.log('Cannot save blueprint: missing user or rundownId', { user: !!user, rundownId });
      return;
    }

    // If a save is already in progress, queue this save
    if (saveInProgressRef.current) {
      console.log('Save in progress, queuing new save');
      saveQueueRef.current = {
        updatedLists,
        silent,
        showDateOverride,
        notes,
        crewData,
        cameraPlots
      };
      return;
    }

    saveInProgressRef.current = true;

    const executeSave = async (saveData: any) => {
      try {
        console.log('Executing blueprint save:', {
          rundownId,
          userId: user.id,
          listsCount: saveData.updatedLists.length,
          notesLength: saveData.notes?.length || 0,
          crewDataCount: saveData.crewData?.length || 0,
          cameraPlotCount: saveData.cameraPlots?.length || 0,
          silent: saveData.silent
        });

        // Handle show_date - convert empty string to null
        const dateToSave = saveData.showDateOverride || showDate;
        const validShowDate = dateToSave && dateToSave.trim() !== '' ? dateToSave : null;

        const blueprintData = {
          user_id: user.id,
          rundown_id: rundownId,
          rundown_title: rundownTitle,
          lists: saveData.updatedLists,
          show_date: validShowDate,
          notes: saveData.notes || savedBlueprint?.notes || '',
          crew_data: saveData.crewData || savedBlueprint?.crew_data || [],
          camera_plots: saveData.cameraPlots || savedBlueprint?.camera_plots || [],
          updated_at: new Date().toISOString()
        };

        // Use upsert to ensure only one blueprint per rundown/user combination
        const { data, error } = await supabase
          .from('blueprints')
          .upsert(
            blueprintData,
            { 
              onConflict: 'user_id,rundown_id',
              ignoreDuplicates: false 
            }
          )
          .select()
          .single();

        if (error) {
          console.error('Upsert blueprint error:', error);
          throw error;
        }
        
        console.log('Blueprint saved successfully:', data.id);
        setSavedBlueprint(data);

        if (!saveData.silent) {
          toast({
            title: 'Success',
            description: 'Blueprint saved successfully!',
          });
        }
      } catch (error) {
        console.error('Blueprint save error:', error);
        if (!saveData.silent) {
          toast({
            title: 'Error',
            description: 'Failed to save blueprint',
            variant: 'destructive',
          });
        }
        throw error;
      }
    };

    try {
      // Execute the current save
      await executeSave({
        updatedLists,
        silent,
        showDateOverride,
        notes,
        crewData,
        cameraPlots
      });

      // If there's a queued save, execute it
      if (saveQueueRef.current) {
        console.log('Executing queued save');
        const queuedSave = saveQueueRef.current;
        saveQueueRef.current = null;
        await executeSave(queuedSave);
      }
    } finally {
      saveInProgressRef.current = false;
    }
  }, [user, rundownId, rundownTitle, showDate, savedBlueprint, setSavedBlueprint, toast]);

  return {
    loadBlueprint,
    saveBlueprint
  };
};
