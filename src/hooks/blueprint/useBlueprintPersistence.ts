
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

      console.log('Loaded blueprint data:', data);
      setSavedBlueprint(data);
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

    console.log('Saving blueprint:', {
      rundownId,
      userId: user.id,
      listsCount: updatedLists.length,
      notesLength: notes?.length || 0,
      crewDataCount: crewData?.length || 0,
      cameraPlotCount: cameraPlots?.length || 0,
      silent
    });

    try {
      // Handle show_date - convert empty string to null
      const dateToSave = showDateOverride || showDate;
      const validShowDate = dateToSave && dateToSave.trim() !== '' ? dateToSave : null;

      const blueprintData = {
        user_id: user.id,
        rundown_id: rundownId,
        rundown_title: rundownTitle,
        lists: updatedLists,
        show_date: validShowDate,
        notes: notes || savedBlueprint?.notes || '',
        crew_data: crewData || savedBlueprint?.crew_data || [],
        camera_plots: cameraPlots || savedBlueprint?.camera_plots || [],
        updated_at: new Date().toISOString()
      };

      console.log('Blueprint data to save:', blueprintData);

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
      
      console.log('Blueprint upserted successfully:', data);
      setSavedBlueprint(data);

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
  }, [user, rundownId, rundownTitle, showDate, savedBlueprint, setSavedBlueprint, toast]);

  return {
    loadBlueprint,
    saveBlueprint
  };
};
