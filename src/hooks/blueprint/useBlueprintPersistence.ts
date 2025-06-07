
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
  const latestBlueprintRef = useRef<any>(null);

  const loadBlueprint = useCallback(async () => {
    if (!user || !rundownId) {
      console.log('Cannot load blueprint: missing user or rundownId');
      return null;
    }
    
    try {
      console.log('Loading blueprint for rundown:', rundownId, 'user:', user.id);
      
      // First, get the rundown to check if it belongs to a team
      const { data: rundownData, error: rundownError } = await supabase
        .from('rundowns')
        .select('team_id')
        .eq('id', rundownId)
        .single();

      if (rundownError) {
        console.error('Error getting rundown team info:', rundownError);
        return null;
      }

      let blueprintQuery = supabase
        .from('blueprints')
        .select('*')
        .eq('rundown_id', rundownId)
        .order('updated_at', { ascending: false })
        .limit(1);

      // If rundown has a team_id, look for team blueprints, otherwise use user-specific
      if (rundownData.team_id) {
        console.log('Loading team blueprint for team:', rundownData.team_id);
        blueprintQuery = blueprintQuery.eq('team_id', rundownData.team_id);
      } else {
        console.log('Loading user blueprint for user:', user.id);
        blueprintQuery = blueprintQuery.eq('user_id', user.id).is('team_id', null);
      }

      const { data, error } = await blueprintQuery.maybeSingle();

      if (error) {
        console.error('Error loading blueprint:', error);
        return null;
      }

      if (data) {
        console.log('Loaded blueprint data:', data.id);
        setSavedBlueprint(data);
        latestBlueprintRef.current = data;
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

    // First, get the rundown to check if it belongs to a team
    const { data: rundownData, error: rundownError } = await supabase
      .from('rundowns')
      .select('team_id')
      .eq('id', rundownId)
      .single();

    if (rundownError) {
      console.error('Error getting rundown team info:', rundownError);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to save blueprint - could not access rundown',
          variant: 'destructive',
        });
      }
      return;
    }

    // Create the save data object with current state merged with updates
    const currentBlueprint = latestBlueprintRef.current || savedBlueprint;
    const saveData = {
      updatedLists: updatedLists.length > 0 ? updatedLists : (currentBlueprint?.lists || []),
      silent,
      showDateOverride: showDateOverride !== undefined ? showDateOverride : (currentBlueprint?.show_date || showDate),
      notes: notes !== undefined ? notes : (currentBlueprint?.notes || ''),
      crewData: crewData !== undefined ? crewData : (currentBlueprint?.crew_data || []),
      cameraPlots: cameraPlots !== undefined ? cameraPlots : (currentBlueprint?.camera_plots || []),
      teamId: rundownData.team_id
    };

    // If a save is already in progress, queue this save with merged data
    if (saveInProgressRef.current) {
      console.log('Save in progress, merging with queued save');
      if (saveQueueRef.current) {
        // Merge with existing queued save
        saveQueueRef.current = {
          updatedLists: updatedLists.length > 0 ? updatedLists : saveQueueRef.current.updatedLists,
          silent: saveQueueRef.current.silent && silent,
          showDateOverride: showDateOverride !== undefined ? showDateOverride : saveQueueRef.current.showDateOverride,
          notes: notes !== undefined ? notes : saveQueueRef.current.notes,
          crewData: crewData !== undefined ? crewData : saveQueueRef.current.crewData,
          cameraPlots: cameraPlots !== undefined ? cameraPlots : saveQueueRef.current.cameraPlots,
          teamId: rundownData.team_id
        };
      } else {
        saveQueueRef.current = saveData;
      }
      return;
    }

    saveInProgressRef.current = true;

    const executeSave = async (data: any) => {
      try {
        console.log('Executing blueprint save:', {
          rundownId,
          userId: user.id,
          teamId: data.teamId,
          listsCount: data.updatedLists.length,
          notesLength: data.notes?.length || 0,
          crewDataCount: data.crewData?.length || 0,
          cameraPlotCount: data.cameraPlots?.length || 0,
          silent: data.silent
        });

        // Prepare the blueprint data
        const validShowDate = data.showDateOverride && data.showDateOverride.trim() !== '' ? data.showDateOverride : null;

        const blueprintData = {
          user_id: user.id,
          rundown_id: rundownId,
          rundown_title: rundownTitle,
          lists: data.updatedLists,
          show_date: validShowDate,
          notes: data.notes || '',
          crew_data: data.crewData || [],
          camera_plots: data.cameraPlots || [],
          team_id: data.teamId, // Add team_id for team blueprints
          updated_at: new Date().toISOString()
        };

        // Use different conflict resolution based on whether it's a team blueprint or user blueprint
        const conflictColumns = data.teamId ? 'team_id,rundown_id' : 'user_id,rundown_id';

        const { data: result, error } = await supabase
          .from('blueprints')
          .upsert(
            blueprintData,
            { 
              onConflict: conflictColumns,
              ignoreDuplicates: false 
            }
          )
          .select()
          .single();

        if (error) {
          console.error('Upsert blueprint error:', error);
          throw error;
        }
        
        console.log('Blueprint saved successfully:', result.id);
        setSavedBlueprint(result);
        latestBlueprintRef.current = result;

        if (!data.silent) {
          toast({
            title: 'Success',
            description: data.teamId ? 'Team blueprint saved successfully!' : 'Blueprint saved successfully!',
          });
        }
      } catch (error) {
        console.error('Blueprint save error:', error);
        if (!data.silent) {
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
      await executeSave(saveData);

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
