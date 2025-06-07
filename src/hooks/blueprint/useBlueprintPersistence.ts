
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

      // If no team blueprint exists, try to load personal blueprint and convert it
      if (!data) {
        const { data: personalData } = await supabase
          .from('blueprints')
          .select('*')
          .eq('rundown_id', rundownId)
          .eq('user_id', user.id)
          .is('team_id', null)
          .maybeSingle();

        if (personalData) {
          // Convert personal blueprint to team blueprint
          const teamBlueprint = {
            rundown_id: personalData.rundown_id,
            rundown_title: personalData.rundown_title,
            user_id: user.id,
            team_id: rundownData.team_id,
            lists: personalData.lists || [],
            show_date: personalData.show_date,
            notes: personalData.notes,
            crew_data: personalData.crew_data || [],
            camera_plots: personalData.camera_plots || [],
            component_order: personalData.component_order || ['crew-list', 'camera-plot', 'scratchpad'],
            updated_at: new Date().toISOString()
          };

          // Insert team blueprint (let database generate new ID)
          const { data: newTeamData, error: createError } = await supabase
            .from('blueprints')
            .insert(teamBlueprint)
            .select()
            .single();

          if (!createError && newTeamData) {
            // Delete the personal blueprint after successful conversion
            await supabase
              .from('blueprints')
              .delete()
              .eq('id', personalData.id);

            data = newTeamData;
          } else {
            console.error('Failed to convert to team blueprint:', createError);
            data = personalData; // Fallback to personal blueprint
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

      // Check if blueprint already exists
      const { data: existingBlueprint } = await supabase
        .from('blueprints')
        .select('id')
        .eq('rundown_id', rundownId)
        .eq('team_id', rundownData.team_id)
        .maybeSingle();

      let data, error;

      if (existingBlueprint) {
        // Update existing blueprint
        ({ data, error } = await supabase
          .from('blueprints')
          .update(blueprintData)
          .eq('id', existingBlueprint.id)
          .select()
          .single());
      } else {
        // Insert new blueprint
        ({ data, error } = await supabase
          .from('blueprints')
          .insert(blueprintData)
          .select()
          .single());
      }

      if (error) {
        console.error('Database error saving team blueprint:', error);
        throw error;
      }

      setSavedBlueprint(data);
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
