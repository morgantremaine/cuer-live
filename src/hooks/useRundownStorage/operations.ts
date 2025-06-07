import { supabase } from '@/lib/supabase';
import { SavedRundown } from './types';
import { transformSupabaseRundown } from './dataMapper';

// Debounce map to prevent rapid-fire updates
const debounceMap = new Map<string, NodeJS.Timeout>();

export const updateRundownInSupabase = async (
  rundownId: string,
  data: {
    title?: string;
    items?: any[];
    columns?: any[];
    timezone?: string;
    start_time?: string;
    undo_history?: any[];
    showcaller_state?: any;
  },
  userId: string
) => {
  console.log('💾 Updating rundown in Supabase:', { rundownId, fieldsUpdated: Object.keys(data), data });
  
  // Validate rundown ID - prevent updating with invalid IDs
  if (!rundownId || rundownId === 'new' || rundownId === 'undefined') {
    console.error('❌ Invalid rundown ID for update:', rundownId);
    throw new Error('Cannot update rundown: Invalid rundown ID');
  }
  
  const updateData: any = {
    user_id: userId,
    updated_at: new Date().toISOString()
  };

  // Only include non-undefined fields - be very explicit about what we're updating
  if (data.title !== undefined) {
    updateData.title = data.title;
    console.log('📝 Updating title to:', data.title);
  }
  if (data.items !== undefined) {
    updateData.items = data.items;
    console.log('📋 Updating items count:', data.items.length);
  }
  if (data.columns !== undefined) {
    updateData.columns = data.columns;
    console.log('🗂️ Updating columns');
  }
  if (data.timezone !== undefined) {
    updateData.timezone = data.timezone;
    console.log('🌍 Updating timezone to:', data.timezone);
  }
  if (data.start_time !== undefined) {
    updateData.start_time = data.start_time;
    console.log('⏰ Updating start_time to:', data.start_time);
  }
  if (data.undo_history !== undefined) {
    updateData.undo_history = data.undo_history;
    console.log('↩️ Updating undo_history');
  }
  if (data.showcaller_state !== undefined) {
    updateData.showcaller_state = data.showcaller_state;
    console.log('📡 Updating showcaller_state to:', data.showcaller_state);
  }

  console.log('🚀 Final update data being sent:', updateData);

  const { data: updatedRundown, error } = await supabase
    .from('rundowns')
    .update(updateData)
    .eq('id', rundownId)
    .select(`
      *,
      teams:team_id (
        id,
        name
      )
    `)
    .single();

  if (error) {
    console.error('❌ Error updating rundown:', error);
    throw error;
  }

  console.log('✅ Rundown updated successfully, returned data:', updatedRundown);
  return transformSupabaseRundown(updatedRundown);
};

export class RundownOperations {
  constructor(
    private user: any,
    private saveRundown: (rundown: SavedRundown) => Promise<string>,
    private setSavedRundowns: React.Dispatch<React.SetStateAction<SavedRundown[]>>
  ) {}

  async updateRundown(rundownId: string, data: {
    title?: string;
    items?: any[];
    updateUndoHistory?: boolean;
    archived?: boolean;
    showcaller_state?: any;
  }) {
    if (!this.user) {
      throw new Error('User not authenticated');
    }

    // Validate rundown ID - don't attempt to update invalid IDs
    if (!rundownId || rundownId === 'new' || rundownId === 'undefined') {
      console.error('❌ Cannot update rundown with invalid ID:', rundownId);
      throw new Error('Cannot update rundown: Invalid rundown ID');
    }

    try {
      // Special handling for showcaller_state updates with debouncing
      if (data.showcaller_state !== undefined && Object.keys(data).length === 1) {
        return this.updateShowcallerStateDebounced(rundownId, data.showcaller_state);
      }

      const rundownData: any = {};
      
      // Only include fields that are provided - be very explicit
      if (data.title !== undefined) {
        rundownData.title = data.title;
        console.log('🏷️ Setting title for update:', data.title);
      }
      if (data.items !== undefined) {
        rundownData.items = data.items;
        console.log('📋 Setting items for update, count:', data.items.length);
      }
      if (data.archived !== undefined) {
        rundownData.archived = data.archived;
        console.log('📦 Setting archived for update:', data.archived);
      }
      if (data.showcaller_state !== undefined) {
        rundownData.showcaller_state = data.showcaller_state;
        console.log('📡 Setting showcaller_state for update:', data.showcaller_state);
      }
      if (data.updateUndoHistory !== undefined) {
        rundownData.undo_history = data.updateUndoHistory ? [] : undefined;
        console.log('↩️ Setting undo_history for update');
      }

      console.log('🎯 Final rundownData being passed to updateRundownInSupabase:', rundownData);

      await updateRundownInSupabase(rundownId, rundownData, this.user.id);

      // Update local state with the same explicit approach
      this.setSavedRundowns(prevRundowns =>
        prevRundowns.map(rundown =>
          rundown.id === rundownId
            ? { 
                ...rundown, 
                ...(data.title !== undefined && { title: data.title }),
                ...(data.items !== undefined && { items: data.items }),
                ...(data.archived !== undefined && { archived: data.archived }),
                ...(data.showcaller_state !== undefined && { showcaller_state: data.showcaller_state }),
                updated_at: new Date().toISOString() 
              }
            : rundown
        )
      );

      console.log('✅ Rundown updated successfully');
    } catch (error) {
      console.error('❌ Error updating rundown:', error);
      throw error;
    }
  }

  private async updateShowcallerStateDebounced(rundownId: string, showcallerState: any) {
    // Validate rundown ID for showcaller updates too
    if (!rundownId || rundownId === 'new' || rundownId === 'undefined') {
      console.error('❌ Cannot update showcaller state with invalid rundown ID:', rundownId);
      return;
    }

    console.log('📡 Debounced showcaller state update for:', rundownId, showcallerState);
    
    // Clear any existing debounce timer for this rundown
    const existingTimer = debounceMap.get(rundownId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set a new debounce timer
    const timer = setTimeout(async () => {
      try {
        console.log('⏰ Executing debounced showcaller state update');
        await updateRundownInSupabase(rundownId, { showcaller_state: showcallerState }, this.user.id);
        
        // Update local state immediately for responsive UI
        this.setSavedRundowns(prevRundowns =>
          prevRundowns.map(rundown =>
            rundown.id === rundownId
              ? { 
                  ...rundown, 
                  showcaller_state: showcallerState,
                  updated_at: new Date().toISOString() 
                }
              : rundown
          )
        );
        
        debounceMap.delete(rundownId);
        console.log('✅ Showcaller state updated successfully');
      } catch (error) {
        console.error('❌ Error updating showcaller state:', error);
        debounceMap.delete(rundownId);
      }
    }, 300); // Reduced debounce time for better responsiveness

    debounceMap.set(rundownId, timer);
  }

  async deleteRundown(rundownId: string) {
    if (!this.user) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('rundowns')
        .delete()
        .eq('id', rundownId);

      if (error) {
        console.error('❌ Error deleting rundown:', error);
        throw error;
      }

      // Update local state
      this.setSavedRundowns(prevRundowns =>
        prevRundowns.filter(rundown => rundown.id !== rundownId)
      );

      console.log('✅ Rundown deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting rundown:', error);
      throw error;
    }
  }

  async archiveRundown(rundownId: string) {
    return this.updateRundown(rundownId, { archived: true });
  }

  async duplicateRundown(rundownId: string, title: string, items: any[]) {
    if (!this.user) {
      throw new Error('User not authenticated');
    }

    try {
      const duplicatedRundown: SavedRundown = {
        id: '',
        user_id: this.user.id,
        title: `${title} (Copy)`,
        items,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived: false
      };

      await this.saveRundown(duplicatedRundown);
      console.log('✅ Rundown duplicated successfully');
    } catch (error) {
      console.error('❌ Error duplicating rundown:', error);
      throw error;
    }
  }
}
