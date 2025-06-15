
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useCsvImport = () => {
  const navigate = useNavigate();
  const { saveRundown } = useRundownStorage();
  const { user } = useAuth();
  const { toast } = useToast();

  const createRundownFromCsv = useCallback(async (data: {
    items: RundownItem[];
    columns: Column[];
    title: string;
  }) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to create a rundown',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create new rundown object with both items and columns
      const newRundown = {
        id: '',
        user_id: user.id,
        title: data.title,
        items: data.items,
        columns: data.columns, // Include the imported columns
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        start_time: '00:00:00',
        icon: '📋',
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        undo_history: [],
        team_id: '', // Will be set by saveRundown
        visibility: 'private' as const,
        teams: null,
        creator_profile: null
      };

      // Save the rundown with both items and columns
      const rundownId = await saveRundown(newRundown);
      
      // Navigate to the new rundown
      navigate(`/rundown/${rundownId}`);

      toast({
        title: 'Import successful',
        description: `Created "${data.title}" with ${data.items.length} items and ${data.columns.filter(c => c.isCustom).length} custom columns`,
      });

      return rundownId;
    } catch (error) {
      console.error('Error creating rundown from CSV:', error);
      toast({
        title: 'Import failed',
        description: 'Failed to create rundown from CSV data',
        variant: 'destructive',
      });
      throw error;
    }
  }, [user, saveRundown, navigate, toast]);

  return {
    createRundownFromCsv
  };
};
