
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface RundownFolder {
  id: string;
  name: string;
  color: string;
  position: number;
  team_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useRundownFolders = (teamId?: string) => {
  const [folders, setFolders] = useState<RundownFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFolders = async () => {
    console.log('🗂️ fetchFolders: Called with', { teamId, userId: !!user, loading });
    
    if (!teamId || !user) {
      console.log('🗂️ fetchFolders: Missing teamId or user, setting loading to false', { teamId: !!teamId, user: !!user });
      setLoading(false);
      setFolders([]);
      return;
    }
    
    console.log('🗂️ fetchFolders: Loading folders for team:', teamId);
    
    try {
      const { data, error } = await supabase
        .from('rundown_folders')
        .select('*')
        .eq('team_id', teamId)
        .order('position', { ascending: true });

      if (error) {
        console.error('🗂️ fetchFolders: Database error:', error);
        throw error;
      }
      
      console.log('🗂️ fetchFolders: Successfully loaded folders:', {
        count: data?.length || 0,
        folders: data?.map(f => ({ id: f.id, name: f.name })) || []
      });
      setFolders(data || []);
    } catch (error) {
      console.error('🗂️ fetchFolders: Error fetching folders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load folders',
        variant: 'destructive',
      });
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async (name: string, color: string = '#6B7280') => {
    if (!teamId || !user) return null;

    try {
      const maxPosition = Math.max(...folders.map(f => f.position), -1);
      
      const { data, error } = await supabase
        .from('rundown_folders')
        .insert({
          name,
          color,
          position: maxPosition + 1,
          team_id: teamId,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setFolders(prev => [...prev, data]);
      toast({
        title: 'Folder created',
        description: `"${name}" folder created successfully`,
      });
      
      return data;
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateFolder = async (id: string, updates: Partial<Pick<RundownFolder, 'name' | 'color'>>) => {
    try {
      const { data, error } = await supabase
        .from('rundown_folders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setFolders(prev => prev.map(f => f.id === id ? data : f));
      toast({
        title: 'Folder updated',
        description: 'Folder updated successfully',
      });
      
      return data;
    } catch (error) {
      console.error('Error updating folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to update folder',
        variant: 'destructive',
      });
      return null;
    }
  };

  const reorderFolders = async (reorderedFolders: RundownFolder[]) => {
    try {
      console.log('Reordering folders:', reorderedFolders.map(f => ({ id: f.id, position: f.position })));
      
      // Update positions one by one instead of using upsert
      for (const folder of reorderedFolders) {
        const { error } = await supabase
          .from('rundown_folders')
          .update({ 
            position: folder.position
          })
          .eq('id', folder.id);

        if (error) {
          console.error('Error updating folder position:', error);
          throw error;
        }
      }

      // Update local state
      setFolders(reorderedFolders);
      
      return true;
    } catch (error) {
      console.error('Error reordering folders:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder folders',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rundown_folders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setFolders(prev => prev.filter(f => f.id !== id));
      toast({
        title: 'Folder deleted',
        description: 'Folder deleted successfully. Rundowns moved to All Rundowns.',
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete folder',
        variant: 'destructive',
      });
      return false;
    }
  };

  const moveRundownToFolder = async (rundownId: string, folderId: string | null) => {
    try {
      console.log('Moving rundown to folder:', { rundownId, folderId });
      
      const { data, error } = await supabase
        .from('rundowns')
        .update({ 
          folder_id: folderId
          // No manual updated_at to reduce spurious realtime notifications
        })
        .eq('id', rundownId)
        .select()
        .single();

      if (error) {
        console.error('Database error moving rundown:', error);
        throw error;
      }
      
      console.log('Successfully moved rundown:', data);
      return true;
    } catch (error) {
      console.error('Error moving rundown to folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to move rundown to folder',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    console.log('🗂️ useRundownFolders: teamId or user changed', { teamId: !!teamId, user: !!user });
    fetchFolders();
  }, [teamId, user?.id]);

  return {
    folders,
    loading,
    createFolder,
    updateFolder,
    deleteFolder,
    reorderFolders,
    moveRundownToFolder,
    refetch: fetchFolders
  };
};
