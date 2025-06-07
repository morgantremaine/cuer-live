
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

      const blueprintData = {
        rundown_id: rundownId,
        rundown_title: rundownTitle,
        user_id: user.id,
        lists,
        show_date: showDateOverride || showDate,
        notes: notesOverride !== undefined ? notesOverride : savedBlueprint?.notes,
        crew_data: crewDataOverride !== undefined ? crewDataOverride : savedBlueprint?.crew_data,
        camera_plots: cameraPlots !== undefined ? cameraPlots : savedBlueprint?.camera_plots,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('blueprints')
        .upsert(blueprintData, {
          onConflict: 'rundown_id,user_id'
        })
        .select()
        .single();

      if (error) throw error;

      setSavedBlueprint(data);
    } catch (error) {
      // Silent error handling
    }
  }, [rundownId, rundownTitle, showDate, savedBlueprint, setSavedBlueprint]);

  return {
    loadBlueprint,
    saveBlueprint
  };
};
