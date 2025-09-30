
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BlueprintList } from '@/types/blueprint';
import { useBlueprintSignatureIntegration } from './useBlueprintSignatureIntegration';

interface PartialBlueprintUpdate {
  lists?: BlueprintList[];
  showDate?: string;
  notes?: string;
  crewData?: any[];
  cameraPlots?: any[];
  componentOrder?: string[];
}

export const useBlueprintPersistence = (
  rundownId: string,
  rundownTitle: string,
  showDate: string,
  savedBlueprint: any,
  setSavedBlueprint: (blueprint: any) => void
) => {
  const lastSavedSignatureRef = useRef<string | null>(null);
  // Load blueprint from database - team blueprints only
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

      // Get the rundown to determine the team_id
      const { data: rundownData, error: rundownError } = await supabase
        .from('rundowns')
        .select('team_id')
        .eq('id', rundownId)
        .maybeSingle();

      if (rundownError) {
        console.error('📋 Error fetching rundown data:', rundownError);
        return null;
      }

      if (!rundownData?.team_id) {
        console.log('📋 No team_id found for rundown - cannot load blueprint');
        return null;
      }

      // Load team blueprint
      console.log('📋 Loading team blueprint for team:', rundownData.team_id);
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('rundown_id', rundownId)
        .eq('team_id', rundownData.team_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('📋 Error loading team blueprint:', error);
        throw error;
      }

      if (data) {
        console.log('📋 LOAD DEBUG - Team blueprint raw data:', data);
        console.log('📋 LOAD DEBUG - Team blueprint lists:', data.lists);
        console.log('📋 LOAD DEBUG - Team blueprint component_order:', data.component_order);
        
        // Enhanced debugging for lists data
        if (data.lists && Array.isArray(data.lists)) {
          data.lists.forEach((list: any, index: number) => {
            console.log(`📋 LOAD DEBUG - List ${index}: ${list.name} (${list.id})`);
            console.log(`📋 LOAD DEBUG - List ${index} checkedItems:`, list.checkedItems);
            console.log(`📋 LOAD DEBUG - List ${index} items:`, list.items);
          });
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

  // Save blueprint to database - supports both full and partial updates
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
        .maybeSingle();

      if (rundownError) {
        console.error('📋 Error fetching rundown for save:', rundownError);
        return;
      }

      if (!rundownData?.team_id) {
        console.error('📋 Cannot save blueprint: no team_id found for rundown');
        return;
      }

      // Helper function to safely handle date conversion
      const safeDateValue = (dateString: string | undefined) => {
        if (!dateString || dateString.trim() === '') {
          return null;
        }
        return dateString;
      };

      // Prepare the blueprint data with proper validation
      const blueprintData = {
        rundown_id: rundownId,
        rundown_title: rundownTitle || 'Untitled Rundown',
        user_id: user.id,
        team_id: rundownData.team_id,
        lists: Array.isArray(lists) ? lists : [],
        show_date: safeDateValue(showDateOverride !== undefined ? showDateOverride : showDate),
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

      // Enhanced debugging for save operation
      console.log('📋 SAVE DEBUG - Full blueprint data being saved:', blueprintData);
      console.log('📋 SAVE DEBUG - Lists being saved:');
      blueprintData.lists.forEach((list: BlueprintList, index: number) => {
        console.log(`📋 SAVE DEBUG - List ${index}: ${list.name} (${list.id})`);
        console.log(`📋 SAVE DEBUG - List ${index} checkedItems:`, list.checkedItems);
        console.log(`📋 SAVE DEBUG - List ${index} items count:`, list.items?.length || 0);
      });
      console.log('📋 SAVE DEBUG - Component order being saved:', blueprintData.component_order);

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
      console.log('📋 SAVE RESULT DEBUG - Saved data verification:', data);
      
      // Update saved signature for change tracking
      const { blueprintSignature } = useBlueprintSignatureIntegration({
        lists: data.lists || [],
        showDate: data.show_date || '',
        notes: data.notes || '',
        cameraPlots: data.camera_plots || [],
        componentOrder: data.component_order || []
      });
      lastSavedSignatureRef.current = blueprintSignature;
      
      setSavedBlueprint(data);
    } catch (error) {
      console.error('📋 Error saving blueprint:', error);
      // Silent error handling - don't throw to prevent disrupting the UI
    }
  }, [rundownId, rundownTitle, showDate, savedBlueprint, setSavedBlueprint]);

  // New partial save function - only updates specific fields
  const savePartialBlueprint = useCallback(async (partialUpdate: PartialBlueprintUpdate, silent = true) => {
    if (!rundownId) {
      console.log('📋 Partial save skipped - no rundownId');
      return;
    }

    try {
      console.log('📋 Starting partial save operation for rundown:', rundownId, 'updating:', Object.keys(partialUpdate));
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('📋 Partial save skipped - no authenticated user');
        return;
      }

      // Get the rundown to determine the team_id
      const { data: rundownData, error: rundownError } = await supabase
        .from('rundowns')
        .select('team_id')
        .eq('id', rundownId)
        .maybeSingle();

      if (rundownError) {
        console.error('📋 Error fetching rundown for partial save:', rundownError);
        return;
      }

      if (!rundownData?.team_id) {
        console.error('📋 Cannot partial save blueprint: no team_id found for rundown');
        return;
      }

      // Get existing blueprint first
      const { data: existingBlueprint, error: existingError } = await supabase
        .from('blueprints')
        .select('*')
        .eq('rundown_id', rundownId)
        .eq('team_id', rundownData.team_id)
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('📋 Error fetching existing blueprint for partial save:', existingError);
        return;
      }

      // Create update object with only the fields that should be updated
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Only add fields that are explicitly provided in the partial update
      if (partialUpdate.lists !== undefined) {
        updateData.lists = partialUpdate.lists;
        console.log('📋 PARTIAL SAVE - Updating lists:', partialUpdate.lists.length);
      }
      if (partialUpdate.showDate !== undefined) {
        updateData.show_date = partialUpdate.showDate || null;
        console.log('📋 PARTIAL SAVE - Updating show_date:', partialUpdate.showDate);
      }
      if (partialUpdate.notes !== undefined) {
        updateData.notes = partialUpdate.notes || null;
        console.log('📋 PARTIAL SAVE - Updating notes:', partialUpdate.notes?.length || 0, 'characters');
      }
      if (partialUpdate.crewData !== undefined) {
        updateData.crew_data = partialUpdate.crewData;
      }
      if (partialUpdate.cameraPlots !== undefined) {
        updateData.camera_plots = partialUpdate.cameraPlots;
      }
      if (partialUpdate.componentOrder !== undefined) {
        updateData.component_order = partialUpdate.componentOrder;
      }

      let data, error;

      if (existingBlueprint) {
        console.log('📋 Partially updating existing blueprint:', existingBlueprint.id);
        // Update existing blueprint with only the changed fields
        ({ data, error } = await supabase
          .from('blueprints')
          .update(updateData)
          .eq('id', existingBlueprint.id)
          .select()
          .single());
      } else {
        console.log('📋 Creating new blueprint with partial data');
        // Create new blueprint with provided data and defaults
        const newBlueprintData = {
          rundown_id: rundownId,
          rundown_title: rundownTitle || 'Untitled Rundown',
          user_id: user.id,
          team_id: rundownData.team_id,
          lists: partialUpdate.lists || [],
          show_date: partialUpdate.showDate || null,
          notes: partialUpdate.notes || null,
          crew_data: partialUpdate.crewData || [],
          camera_plots: partialUpdate.cameraPlots || [],
          component_order: partialUpdate.componentOrder || ['crew-list', 'camera-plot', 'scratchpad'],
          updated_at: new Date().toISOString()
        };

        ({ data, error } = await supabase
          .from('blueprints')
          .insert(newBlueprintData)
          .select()
          .single());
      }

      if (error) {
        console.error('📋 Database error in partial save:', error);
        throw error;
      }

      console.log('📋 Partial blueprint save successful:', data.id);
      console.log('📋 PARTIAL SAVE RESULT - Updated fields:', Object.keys(updateData));
      
      // Update saved signature for change tracking
      const { blueprintSignature } = useBlueprintSignatureIntegration({
        lists: data.lists || [],
        showDate: data.show_date || '',
        notes: data.notes || '',
        cameraPlots: data.camera_plots || [],
        componentOrder: data.component_order || []
      });
      lastSavedSignatureRef.current = blueprintSignature;
      
      setSavedBlueprint(data);
    } catch (error) {
      console.error('📋 Error in partial save:', error);
      // Silent error handling - don't throw to prevent disrupting the UI
    }
  }, [rundownId, rundownTitle, setSavedBlueprint]);

  // Check if blueprint has unsaved changes
  const hasBlueprintChanges = useCallback((currentData: {
    lists: BlueprintList[];
    showDate: string;
    notes?: string;
    cameraPlots?: any[];
    componentOrder?: string[];
  }): boolean => {
    const { hasBlueprintChanges } = useBlueprintSignatureIntegration(currentData);
    return hasBlueprintChanges(lastSavedSignatureRef.current);
  }, []);

  return {
    loadBlueprint,
    saveBlueprint,
    savePartialBlueprint,
    hasBlueprintChanges
  };
};
