import { supabase } from '@/integrations/supabase/client'
import { RundownItem } from '@/hooks/useRundownItems'
import { Column } from '@/types/columns'
import { SavedRundown } from './types'
import { mapDatabaseToRundown } from './dataMapper'
import { useBulletproofSave } from '@/hooks/bulletproof/useBulletproofSave'

export class RundownOperations {
  private bulletproofSave: ReturnType<typeof useBulletproofSave>['bulletproofSave'];

  constructor(
    private user: any,
    private saveRundown: (rundown: SavedRundown) => Promise<string>,
    private setSavedRundowns: React.Dispatch<React.SetStateAction<SavedRundown[]>>,
    bulletproofSave: ReturnType<typeof useBulletproofSave>['bulletproofSave']
  ) {
    this.bulletproofSave = bulletproofSave;
  }

  async updateRundown(
    id: string,
    title: string,
    items: RundownItem[],
    silent: boolean = false,
    archived: boolean = false,
    columns?: Column[],
    timezone?: string,
    startTime?: string,
    icon?: string,
    undoHistory?: any[],
    teamId?: string
  ) {
    if (!this.user) {
      throw new Error('User not authenticated');
    }

    const updateData = {
      title,
      items,
      archived,
      columns,
      timezone,
      start_time: startTime,
      icon,
      undo_history: undoHistory,
      team_id: teamId,
      user_id: this.user.id
    };

    const saveOperation = async () => {
      const { data, error } = await supabase
        .from('rundowns')
        .update({
          ...updateData,
          last_updated_by: this.user.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    };

    const result = await this.bulletproofSave(saveOperation, {
      rundownId: id,
      saveType: silent ? 'auto' : 'manual',
      fallbackKey: `rundown_update_${id}`,
      enableVerification: !silent
    });

    if (result.success && result.data) {
      const updatedRundown = mapDatabaseToRundown(result.data);
      this.setSavedRundowns(prevRundowns => 
        prevRundowns.map(r => r.id === id ? updatedRundown : r)
      );
    } else {
      console.error('Bulletproof save failed:', result.error);
      throw new Error(result.error || 'Failed to update rundown');
    }
  }

  async deleteRundown(id: string) {
    if (!this.user) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('rundowns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this.setSavedRundowns(prevRundowns => 
        prevRundowns.filter(r => r.id !== id)
      );
    } catch (error) {
      console.error('Error deleting rundown:', error);
      throw error;
    }
  }

  async archiveRundown(id: string) {
    const rundown = await this.getRundownById(id);
    if (rundown) {
      return this.updateRundown(id, rundown.title, rundown.items, false, true);
    }
  }

  async duplicateRundown(rundown: SavedRundown): Promise<string> {
    if (!this.user) {
      throw new Error('User not authenticated');
    }

    try {
      // Create the duplicated rundown data
      const duplicatedRundown: Omit<SavedRundown, 'id'> = {
        user_id: this.user.id,
        title: `${rundown.title} (Copy)`,
        items: rundown.items || [],
        columns: rundown.columns,
        timezone: rundown.timezone,
        start_time: rundown.start_time,
        icon: rundown.icon,
        team_id: rundown.team_id,
        archived: false, // Always create duplicates as active
        undo_history: [], // Start with empty undo history
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save the duplicated rundown and return its ID
      return await this.saveRundown(duplicatedRundown as SavedRundown);
    } catch (error) {
      console.error('Error duplicating rundown:', error);
      throw error;
    }
  }

  private async getRundownById(id: string): Promise<SavedRundown | null> {
    try {
      const { data, error } = await supabase
        .from('rundowns')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return mapDatabaseToRundown(data);
    } catch (error) {
      console.error('Error fetching rundown:', error);
      return null;
    }
  }
}
