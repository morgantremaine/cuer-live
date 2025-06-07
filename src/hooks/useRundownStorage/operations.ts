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
