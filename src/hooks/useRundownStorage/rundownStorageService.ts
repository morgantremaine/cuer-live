
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { SavedRundown } from './types';

export class RundownStorageService {
  static async loadRundowns(userId: string): Promise<SavedRundown[]> {
    const { data, error } = await supabase
      .from('rundowns')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading rundowns:', error);
      throw error;
    }

    return data || [];
  }

  static async saveRundown(
    userId: string,
    title: string,
    items: RundownItem[],
    columns?: Column[],
    timezone?: string,
    startTime?: string,
    icon?: string
  ): Promise<SavedRundown> {
    console.log('Saving new rundown to database:', {
      title,
      itemsCount: items.length,
      columnsCount: columns?.length || 0,
      timezone,
      startTime,
      icon,
      userId
    });

    const { data, error } = await supabase
      .from('rundowns')
      .insert({
        user_id: userId,
        title,
        items,
        columns: columns || null,
        timezone: timezone || null,
        start_time: startTime || null,
        icon: icon || null,
        archived: false
      })
      .select()
      .single();

    if (error) {
      console.error('Database error saving rundown:', error);
      throw error;
    }

    console.log('Successfully saved new rundown:', data);
    return data;
  }

  static async updateRundown(
    userId: string,
    id: string,
    title: string,
    items: RundownItem[],
    archived = false,
    columns?: Column[],
    timezone?: string,
    startTime?: string,
    icon?: string
  ): Promise<void> {
    console.log('Updating rundown in database:', {
      id,
      title,
      itemsCount: items.length,
      columnsCount: columns?.length || 0,
      timezone,
      startTime,
      icon,
      userId,
      archived
    });

    const updateData = {
      title: title,
      items: items,
      columns: columns || null,
      timezone: timezone || null,
      start_time: startTime || null,
      icon: icon || null,
      updated_at: new Date().toISOString(),
      archived: archived
    };

    console.log('Update payload (cleaned):', updateData);

    const { error, data } = await supabase
      .from('rundowns')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Database error updating rundown:', {
        error,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        id,
        userId,
        updateData
      });
      throw error;
    }

    console.log('Successfully updated rundown:', { id, updatedData: data });
  }

  static async deleteRundown(userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('rundowns')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }
}
