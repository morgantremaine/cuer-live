
import { supabase } from '@/lib/supabase';
import { SavedRundown } from './types';
import { transformSupabaseRundown } from './dataMapper';

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
  console.log('💾 Updating rundown in Supabase:', { rundownId, fieldsUpdated: Object.keys(data) });
  
  const updateData: any = {
    user_id: userId,
    updated_at: new Date().toISOString()
  };

  // Only include non-undefined fields
  if (data.title !== undefined) updateData.title = data.title;
  if (data.items !== undefined) updateData.items = data.items;
  if (data.columns !== undefined) updateData.columns = data.columns;
  if (data.timezone !== undefined) updateData.timezone = data.timezone;
  if (data.start_time !== undefined) updateData.start_time = data.start_time;
  if (data.undo_history !== undefined) updateData.undo_history = data.undo_history;
  if (data.showcaller_state !== undefined) updateData.showcaller_state = data.showcaller_state;

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

  console.log('✅ Rundown updated successfully');
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

    try {
      const rundownData: any = {};
      
      // Only include fields that are provided
      if (data.title !== undefined) rundownData.title = data.title;
      if (data.items !== undefined) rundownData.items = data.items;
      if (data.archived !== undefined) rundownData.archived = data.archived;
      if (data.showcaller_state !== undefined) rundownData.showcaller_state = data.showcaller_state;
      if (data.updateUndoHistory !== undefined) rundownData.undo_history = data.updateUndoHistory ? [] : undefined;

      await updateRundownInSupabase(rundownId, rundownData, this.user.id);

      // Update local state
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
