
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
    if (!rundownId) {
      console.log('📋 Load skipped - no rundownId');
      return null;
    }

    try {
      console.log('📋 Loading blueprint for rundown:', rundownId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('📋 Load skipped - no authenticated user');
        return null;
      }

      // First, get the rundown to determine the team_id
      const { data: rundownData, error: rundownError } = await supabase
        .from('rundowns')
        .select('team_id')
        .eq('id', rundownId)
        .single();

      if (rundownError) {
        console.error('📋 Error fetching rundown data:', rundownError);
        return null;
      }

      if (!rundownData?.team_id) {
        console.log('📋 No team_id found, trying personal blueprint');
        // Fallback to personal blueprint
        const { data, error } = await supabase
          .from('blueprints')
          .select('*')
          .eq('rundown_id', rundownId)
          .eq('user_id', user.id)
          .is('team_id', null)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('📋 Error loading personal blueprint:', error);
          throw error;
        }
        
        console.log('📋 Loaded personal blueprint:', data ? 'found' : 'not found');
        return data;
      }

      // Try to load team blueprint first (for collaboration)
      console.log('📋 Loading team blueprint for team:', rundownData.team_id);
      let { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('rundown_id', rundownId)
        .eq('team_id', rundownData.team_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('📋 Error loading team blueprint:', error);
        throw error;
      }

      // If no team blueprint exists, try to load personal blueprint and convert it
      if (!data) {
        console.log('📋 No team blueprint found, checking for personal blueprint to convert');
        const { data: personalData, error: personalError } = await supabase
          .from('blueprints')
          .select('*')
          .eq('rundown_id', rundownId)
          .eq('user_id', user.id)
          .is('team_id', null)
          .maybeSingle();

        if (personalError && personalError.code !== 'PGRST116') {
          console.error('📋 Error loading personal blueprint for conversion:', personalError);
        }

        if (personalData) {
          console.log('📋 Converting personal blueprint to team blueprint');
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
            console.log('📋 Successfully converted to team blueprint');
            // Delete the personal blueprint after successful conversion
            await supabase
              .from('blueprints')
              .delete()
              .eq('id', personalData.id);

            data = newTeamData;
          } else {
            console.error('📋 Failed to convert to team blueprint:', createError);
            data = personalData; // Fallback to personal blueprint
          }
        }
      }

      console.log('📋 Final loaded blueprint:', data ? {
        id: data.id,
        lists: data.lists?.length || 0,
        showDate: data.show_date,
        notes: data.notes?.length || 0,
        componentOrder: data.component_order
      } : 'none');

      return data;
    } catch (error) {
      console.error('📋 Error loading blueprint:', error);
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
    if (!rundownId) {
      console.log('📋 Save skipped - no rundownId');
      return;
    }

    try {
      console.log('📋 Starting save operation for rundown:', rundownId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('📋 Save skipped - no authenticated user');
        return;
      }

      // Get the rundown to determine the team_id
      const { data: rundownData, error: rundownError } = await supabase
        .from('rundowns')
        .select('team_id')
        .eq('id', rundownId)
        .single();

      if (rundownError) {
        console.error('📋 Error fetching rundown for save:', rundownError);
        return;
      }

      if (!rundownData?.team_id) {
        console.error('📋 Cannot save blueprint: no team_id found for rundown');
        return;
      }

      // Prepare the blueprint data with proper validation
      const blueprintData = {
        rundown_id: rundownId,
        rundown_title: rundownTitle || 'Untitled Rundown',
        user_id: user.id,
        team_id: rundownData.team_id, // Always save as team blueprint
        lists: Array.isArray(lists) ? lists : [],
        show_date: showDateOverride !== undefined ? showDateOverride : (showDate || null),
        notes: notesOverride !== undefined ? notesOverride : (savedBlueprint?.notes || null),
        crew_data: crewDataOverride !== undefined ? crewDataOverride : (savedBlueprint?.crew_data || []),
        camera_plots: cameraPlots !== undefined ? cameraPlots : (savedBlueprint?.camera_plots || []),
        component_order: componentOrder !== undefined ? componentOrder : (savedBlueprint?.component_order || ['crew-list', 'camera-plot', 'scratchpad']),
        updated_at: new Date().toISOString()
      };

      // Ensure arrays are always arrays
      if (!Array.isArray(blueprintData.crew_data)) {
        blueprintData.crew_data = [];
      }
      if (!Array.isArray(blueprintData.camera_plots)) {
        blueprintData.camera_plots = [];
      }
      if (!Array.isArray(blueprintData.component_order)) {
        blueprintData.component_order = ['crew-list', 'camera-plot', 'scratchpad'];
      }

      console.log('📋 Saving blueprint data:', {
        lists: blueprintData.lists.length,
        showDate: blueprintData.show_date,
        notes: blueprintData.notes?.length || 0,
        crewData: blueprintData.crew_data.length,
        cameraPlots: blueprintData.camera_plots.length,
        componentOrder: blueprintData.component_order
      });

      // Check if blueprint already exists
      const { data: existingBlueprint, error: existingError } = await supabase
        .from('blueprints')
        .select('id')
        .eq('rundown_id', rundownId)
        .eq('team_id', rundownData.team_id)
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('📋 Error checking existing blueprint:', existingError);
        throw existingError;
      }

      let data, error;

      if (existingBlueprint) {
        console.log('📋 Updating existing blueprint:', existingBlueprint.id);
        // Update existing blueprint
        ({ data, error } = await supabase
          .from('blueprints')
          .update(blueprintData)
          .eq('id', existingBlueprint.id)
          .select()
          .single());
      } else {
        console.log('📋 Creating new blueprint');
        // Insert new blueprint
        ({ data, error } = await supabase
          .from('blueprints')
          .insert(blueprintData)
          .select()
          .single());
      }

      if (error) {
        console.error('📋 Database error saving blueprint:', error);
        throw error;
      }

      console.log('📋 Blueprint saved successfully:', data.id);
      setSavedBlueprint(data);
    } catch (error) {
      console.error('📋 Error saving blueprint:', error);
      // Silent error handling - don't throw to prevent disrupting the UI
    }
  }, [rundownId, rundownTitle, showDate, savedBlueprint, setSavedBlueprint]);

  return {
    loadBlueprint,
    saveBlueprint
  };
};
