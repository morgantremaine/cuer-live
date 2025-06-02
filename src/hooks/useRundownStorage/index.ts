
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { useToast } from '@/hooks/use-toast';
import { RundownStorageService } from './rundownStorageService';
import { SavedRundown } from './types';

export const useRundownStorage = () => {
  const [savedRundowns, setSavedRundowns] = useState<SavedRundown[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadRundowns = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const rundowns = await RundownStorageService.loadRundowns(user.id);
      setSavedRundowns(rundowns);
    } catch (error) {
      console.error('Error loading rundowns:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rundowns',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveRundown = async (
    title: string,
    items: RundownItem[],
    columns?: Column[],
    timezone?: string,
    startTime?: string,
    icon?: string
  ) => {
    if (!user) {
      console.error('Cannot save: no user');
      return;
    }

    try {
      const data = await RundownStorageService.saveRundown(
        user.id,
        title,
        items,
        columns,
        timezone,
        startTime,
        icon
      );

      toast({
        title: 'Success',
        description: 'Rundown saved successfully!',
      });
      loadRundowns();
      return data;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save rundown',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateRundown = async (
    id: string,
    title: string,
    items: RundownItem[],
    silent = false,
    archived = false,
    columns?: Column[],
    timezone?: string,
    startTime?: string,
    icon?: string
  ) => {
    if (!user) {
      console.error('Cannot update: no user');
      return;
    }

    try {
      await RundownStorageService.updateRundown(
        user.id,
        id,
        title,
        items,
        archived,
        columns,
        timezone,
        startTime,
        icon
      );

      if (!silent) {
        const message = archived ? 'Rundown archived successfully!' : 'Rundown updated successfully!';
        toast({
          title: 'Success',
          description: message,
        });
      }
      loadRundowns();
    } catch (error) {
      if (!silent) {
        toast({
          title: 'Error',
          description: `Failed to update rundown: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: 'destructive',
        });
      }
      throw error;
    }
  };

  const deleteRundown = async (id: string) => {
    if (!user) return;

    try {
      await RundownStorageService.deleteRundown(user.id, id);
      toast({
        title: 'Success',
        description: 'Rundown deleted successfully!',
      });
      loadRundowns();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete rundown',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      loadRundowns();
    }
  }, [user]);

  return {
    savedRundowns,
    loading,
    saveRundown,
    updateRundown,
    deleteRundown,
    loadRundowns,
  };
};

// Export types for external use
export type { SavedRundown } from './types';
