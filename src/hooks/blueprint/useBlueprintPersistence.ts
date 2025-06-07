
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
  // Load blueprint from database - prioritize team blueprints for collaboration
  const loadBlueprint = useCallback(async () => {
    if (!rundownId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // First, get the rundown to determine the team_id
      const { data: rundownData } = await supabase
        .from('rundowns')
        .select('team_id')
        .eq('id', rundownId)
        .single();

      if (!rundownData?.team_id) {
        console.log('No team_id found for rundown, falling back to personal blueprint');
        // Fallback to personal blueprint
        const { data, error } = await supabase
          .from('blueprints')
          .select('*')
          .eq('rundown_id', rundownId)
          .eq('user_id', user.id)
          .is('team_id', null)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        return data;
      }

      // Try to load team blueprint first (for collaboration)
      let { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('rundown_id', rundownId)
        .eq('team_id', rundownData.team_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If no team blueprint exists, try to load personal blueprint and convert it to team blueprint
      if (!data) {
        const { data: personalData } = await supabase
          .from('blueprints')
          .select('*')
          .eq('rundown_id', rundownId)
          .eq('user_id', user.id)
          .is('team_id', null)
          .maybeSingle();

        if (personalData) {
          console.log('Converting personal blueprint to team blueprint for collaboration');
          // Convert personal blueprint to team blueprint
          const teamBlueprint = {
            ...personalData,
            team_id: rundownData.team_id,
            user_id: user.id, // Keep the creator as user_id
            updated_at: new Date().toISOString()
          };

          delete teamBlueprint.id; // Let database generate new ID

          const { data: newTeamData, error: createError } = await supabase
            .from('blueprints')
            .insert(teamBlueprint)
            .select()
            .single();

          if (!createError) {
            // Delete the personal blueprint since we now have a team blueprint
            await supabase
              .from('blueprints')
              .delete()
              .eq('id', personalData.id);

            data = newTeamData;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('Error loading blueprint:', error);
      return null;
    }
  }, [rundownId]);

  // Save blueprint to database - always save as team blueprint for collaboration
  const saveBlueprint = useCallback(async (
    lists: BlueprintList[],
    silent = false,
    showDateOverride?: string,
    notesOverride?: string,
    crewDataOverride?: any,
    cameraPlots?: any,
    componentOrder?: string[]
  ) => {
    if (!rundownId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the rundown to determine the team_id
      const { data: rundownData } = await supabase
        .from('rundowns')
        .select('team_id')
        .eq('id', rundownId)
        .single();

      if (!rundownData?.team_id) {
        console.error('Cannot save blueprint: no team_id found for rundown');
        return;
      }

      // Prepare the blueprint data with proper validation
      const blueprintData = {
        rundown_id: rundownId,
        rundown_title: rundownTitle || 'Untitled Rundown',
        user_id: user.id,
        team_id: rundownData.team_id, // Always save as team blueprint
        lists: Array.isArray(lists) ? lists : [],
        show_date: showDateOverride || showDate || null,
        notes: notesOverride !== undefined ? notesOverride : (savedBlueprint?.notes || null),
        crew_data: crewDataOverride !== undefined ? crewDataOverride : (savedBlueprint?.crew_data || []),
        camera_plots: cameraPlots !== undefined ? cameraPlots : (savedBlueprint?.camera_plots || []),
        component_order: componentOrder !== undefined ? componentOrder : (savedBlueprint?.component_order || ['crew-list', 'camera-plot', 'scratchpad']),
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

      // Ensure component_order is always an array
      if (!Array.isArray(blueprintData.component_order)) {
        blueprintData.component_order = ['crew-list', 'camera-plot', 'scratchpad'];
      }

      console.log('Saving team blueprint data:', {
        rundown_id: blueprintData.rundown_id,
        team_id: blueprintData.team_id,
        user_id: blueprintData.user_id,
        lists_count: blueprintData.lists.length,
        crew_data_count: blueprintData.crew_data.length,
        component_order: blueprintData.component_order,
        has_notes: !!blueprintData.notes,
        has_show_date: !!blueprintData.show_date
      });

      const { data, error } = await supabase
        .from('blueprints')
        .upsert(blueprintData, {
          onConflict: 'rundown_id,team_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Database error saving team blueprint:', error);
        throw error;
      }

      setSavedBlueprint(data);
      console.log('Team blueprint saved successfully');
    } catch (error) {
      console.error('Error saving team blueprint:', error);
      // Silent error handling - don't throw to prevent disrupting the UI
    }
  }, [rundownId, rundownTitle, showDate, savedBlueprint, setSavedBlueprint]);

  return {
    loadBlueprint,
    saveBlueprint
  };
};
