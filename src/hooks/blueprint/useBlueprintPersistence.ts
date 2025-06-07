
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BlueprintList } from '@/types/blueprint';

export const useBlueprintPersistence = (
  rundownId: string,
  rundownTitle: string,
  showDate: string,
  savedBlueprint: any,
  setSavedBlueprint: (blueprint: any) => void
) => {
  // Load blueprint from database
  const loadBlueprint = useCallback(async () => {
    if (!rundownId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Try to load user's personal blueprint first
      let { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('rundown_id', rundownId)
        .eq('user_id', user.id)
        .maybeSingle();

      // If no personal blueprint, try to load team blueprint
      if (!data && !error) {
        const { data: teamData } = await supabase
          .from('blueprints')
          .select('*')
          .eq('rundown_id', rundownId)
          .not('team_id', 'is', null)
          .maybeSingle();
        
        data = teamData;
      }

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error loading blueprint:', error);
      return null;
    }
  }, [rundownId]);

  // Save blueprint to database
  const saveBlueprint = useCallback(async (
    lists: BlueprintList[],
    silent = false,
    showDateOverride?: string,
    notesOverride?: string,
    crewDataOverride?: any,
    cameraPlots?: any
  ) => {
    if (!rundownId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Prepare the blueprint data with proper validation
      const blueprintData = {
        rundown_id: rundownId,
        rundown_title: rundownTitle || 'Untitled Rundown',
        user_id: user.id,
        lists: Array.isArray(lists) ? lists : [],
        show_date: showDateOverride || showDate || null,
        notes: notesOverride !== undefined ? notesOverride : (savedBlueprint?.notes || null),
        crew_data: crewDataOverride !== undefined ? crewDataOverride : (savedBlueprint?.crew_data || []),
        camera_plots: cameraPlots !== undefined ? cameraPlots : (savedBlueprint?.camera_plots || []),
        updated_at: new Date().toISOString()
      };

      // Ensure crew_data is always an array
      if (!Array.isArray(blueprintData.crew_data)) {
        blueprintData.crew_data = [];
      }

      // Ensure camera_plots is always an array
      if (!Array.isArray(blueprintData.camera_plots)) {
        blueprintData.camera_plots = [];
      }

      console.log('Saving blueprint data:', {
        rundown_id: blueprintData.rundown_id,
        user_id: blueprintData.user_id,
        lists_count: blueprintData.lists.length,
        crew_data_count: blueprintData.crew_data.length,
        has_notes: !!blueprintData.notes,
        has_show_date: !!blueprintData.show_date
      });

      const { data, error } = await supabase
        .from('blueprints')
        .upsert(blueprintData, {
          onConflict: 'rundown_id,user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Database error saving blueprint:', error);
        throw error;
      }

      setSavedBlueprint(data);
      console.log('Blueprint saved successfully');
    } catch (error) {
      console.error('Error saving blueprint:', error);
      // Silent error handling - don't throw to prevent disrupting the UI
    }
  }, [rundownId, rundownTitle, showDate, savedBlueprint, setSavedBlueprint]);

  return {
    loadBlueprint,
    saveBlueprint
  };
};
