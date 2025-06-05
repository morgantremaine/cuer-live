
import { useCallback, useRef } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useBlueprintUnifiedPersistence = (
  rundownId: string,
  rundownTitle: string,
  showDate: string,
  savedBlueprint: any,
  setSavedBlueprint: (blueprint: any) => void
) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const saveInProgressRef = useRef(false);
  const pendingSaveRef = useRef<any>(null);

  const loadBlueprint = useCallback(async () => {
    if (!user || !rundownId) return null;
    
    try {
      console.log('Blueprint unified: Loading blueprint for rundown:', rundownId);
      
      // Check for multiple blueprints and get the most complete one
      const { data: blueprints, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Blueprint unified: Error loading blueprints:', error);
        return null;
      }

      if (!blueprints || blueprints.length === 0) {
        console.log('Blueprint unified: No blueprints found');
        return null;
      }

      // If multiple blueprints exist, merge them and clean up duplicates
      if (blueprints.length > 1) {
        console.log('Blueprint unified: Found multiple blueprints, merging:', blueprints.length);
        const mergedBlueprint = await mergeAndCleanupBlueprints(blueprints);
        setSavedBlueprint(mergedBlueprint);
        return mergedBlueprint;
      }

      const blueprint = blueprints[0];
      console.log('Blueprint unified: Loaded blueprint:', blueprint);
      setSavedBlueprint(blueprint);
      return blueprint;
    } catch (error) {
      console.error('Blueprint unified: Exception loading blueprint:', error);
      return null;
    }
  }, [user, rundownId, setSavedBlueprint]);

  const mergeAndCleanupBlueprints = async (blueprints: any[]) => {
    try {
      // Find the most complete blueprint data
      const mergedData = {
        id: blueprints[0].id, // Use the most recent ID
        user_id: user!.id,
        rundown_id: rundownId,
        rundown_title: rundownTitle,
        lists: [],
        show_date: showDate,
        notes: '',
        crew_data: [],
        camera_plots: [],
        updated_at: new Date().toISOString()
      };

      // Merge data from all blueprints
      blueprints.forEach(blueprint => {
        if (blueprint.lists && blueprint.lists.length > 0) {
          mergedData.lists = blueprint.lists;
        }
        if (blueprint.notes) {
          mergedData.notes = blueprint.notes;
        }
        if (blueprint.crew_data && blueprint.crew_data.length > 0) {
          mergedData.crew_data = blueprint.crew_data;
        }
        if (blueprint.camera_plots && blueprint.camera_plots.length > 0) {
          mergedData.camera_plots = blueprint.camera_plots;
        }
        if (blueprint.show_date) {
          mergedData.show_date = blueprint.show_date;
        }
      });

      // Update the primary blueprint with merged data
      const { data: updatedBlueprint, error: updateError } = await supabase
        .from('blueprints')
        .update(mergedData)
        .eq('id', mergedData.id)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Delete duplicate blueprints
      const duplicateIds = blueprints.slice(1).map(bp => bp.id);
      if (duplicateIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('blueprints')
          .delete()
          .in('id', duplicateIds)
          .eq('user_id', user!.id);

        if (deleteError) {
          console.error('Blueprint unified: Error deleting duplicates:', deleteError);
        } else {
          console.log('Blueprint unified: Cleaned up', duplicateIds.length, 'duplicate blueprints');
        }
      }

      return updatedBlueprint;
    } catch (error) {
      console.error('Blueprint unified: Error merging blueprints:', error);
      return blueprints[0]; // Fallback to the most recent
    }
  };

  const saveBlueprint = useCallback(async (
    lists?: BlueprintList[], 
    silent?: boolean, 
    notes?: string, 
    crewData?: any[], 
    cameraPlots?: any[]
  ) => {
    if (!user || !rundownId) {
      console.log('Blueprint unified: Cannot save - no user or rundownId');
      return;
    }

    // If a save is in progress, queue this one
    if (saveInProgressRef.current) {
      console.log('Blueprint unified: Save in progress, queuing new save');
      pendingSaveRef.current = { lists, silent, notes, crewData, cameraPlots };
      return;
    }

    saveInProgressRef.current = true;

    try {
      console.log('Blueprint unified: Saving blueprint with:', {
        listsCount: lists?.length,
        notesLength: notes?.length,
        crewDataCount: crewData?.length,
        cameraPlotsCount: cameraPlots?.length,
        showDate
      });

      const blueprintData = {
        user_id: user.id,
        rundown_id: rundownId,
        rundown_title: rundownTitle,
        lists: lists !== undefined ? lists : (savedBlueprint?.lists || []),
        show_date: showDate,
        notes: notes !== undefined ? notes : (savedBlueprint?.notes || ''),
        crew_data: crewData !== undefined ? crewData : (savedBlueprint?.crew_data || []),
        camera_plots: cameraPlots !== undefined ? cameraPlots : (savedBlueprint?.camera_plots || []),
        updated_at: new Date().toISOString()
      };

      let result;
      
      if (savedBlueprint?.id) {
        console.log('Blueprint unified: Updating existing blueprint:', savedBlueprint.id);
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
        console.log('Blueprint unified: Creating new blueprint');
        const { data, error } = await supabase
          .from('blueprints')
          .insert(blueprintData)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }
      
      console.log('Blueprint unified: Save successful:', result);
      setSavedBlueprint(result);

      if (!silent) {
        toast({
          title: 'Success',
          description: 'Blueprint saved successfully!',
        });
      }
      
      return result;
    } catch (error) {
      console.error('Blueprint unified: Save failed:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to save blueprint',
          variant: 'destructive',
        });
      }
      throw error;
    } finally {
      saveInProgressRef.current = false;
      
      // Process any pending save
      if (pendingSaveRef.current) {
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        console.log('Blueprint unified: Processing pending save');
        setTimeout(() => {
          saveBlueprint(pending.lists, pending.silent, pending.notes, pending.crewData, pending.cameraPlots);
        }, 100);
      }
    }
  }, [user, rundownId, rundownTitle, showDate, savedBlueprint, setSavedBlueprint, toast]);

  return {
    loadBlueprint,
    saveBlueprint
  };
};
