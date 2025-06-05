
import { useCallback } from 'react';
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

  const loadBlueprint = useCallback(async () => {
    if (!user || !rundownId) return null;
    
    try {
      console.log('Blueprint persistence: Loading blueprint for rundown:', rundownId);
      
      // Get the most recent blueprint for this rundown (in case there are multiple)
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Blueprint persistence: Error loading blueprint:', error);
        return null;
      }

      console.log('Blueprint persistence: Loaded blueprint:', data);
      setSavedBlueprint(data);
      return data;
    } catch (error) {
      console.error('Blueprint persistence: Exception loading blueprint:', error);
      return null;
    }
  }, [user, rundownId, setSavedBlueprint]);

  const saveBlueprint = useCallback(async (
    title: string, 
    lists: BlueprintList[], 
    showDate?: string, 
    silent?: boolean, 
    notes?: string, 
    crewData?: any[], 
    cameraPlots?: any[]
  ) => {
    if (!user || !rundownId) {
      console.log('Blueprint persistence: Cannot save - no user or rundownId');
      return;
    }

    console.log('Blueprint persistence: Saving blueprint with:', {
      title,
      listsCount: lists?.length,
      showDate,
      notesLength: notes?.length,
      crewDataCount: crewData?.length,
      cameraPlotsCount: cameraPlots?.length
    });

    try {
      const blueprintData = {
        user_id: user.id,
        rundown_id: rundownId,
        rundown_title: title,
        lists: lists,
        show_date: showDate,
        notes: notes || savedBlueprint?.notes,
        crew_data: crewData || savedBlueprint?.crew_data,
        camera_plots: cameraPlots || savedBlueprint?.camera_plots,
        updated_at: new Date().toISOString()
      };

      let result;
      
      if (savedBlueprint?.id) {
        console.log('Blueprint persistence: Updating existing blueprint:', savedBlueprint.id);
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
        console.log('Blueprint persistence: Creating new blueprint');
        const { data, error } = await supabase
          .from('blueprints')
          .insert(blueprintData)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }
      
      console.log('Blueprint persistence: Save successful:', result);
      setSavedBlueprint(result);

      if (!silent) {
        toast({
          title: 'Success',
          description: 'Blueprint saved successfully!',
        });
      }
      
      return result;
    } catch (error) {
      console.error('Blueprint persistence: Save failed:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to save blueprint',
          variant: 'destructive',
        });
      }
      throw error;
    }
  }, [user, rundownId, savedBlueprint, setSavedBlueprint, toast]);

  return {
    loadBlueprint,
    saveBlueprint
  };
};
