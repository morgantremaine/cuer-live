
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { mapDatabaseToRundown, mapRundownToDatabase, mapRundownsFromDatabase } from './useRundownStorage/dataMapper';
import { SavedRundown } from './useRundownStorage/types';
import { RundownOperations } from './useRundownStorage/operations';

export const useRundownStorage = () => {
  const { user } = useAuth();
  const [savedRundowns, setSavedRundowns] = useState<SavedRundown[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load rundowns from Supabase
  const loadRundowns = useCallback(async () => {
    if (!user) {
      setSavedRundowns([]);
      setLoading(false);
      return;
    }

    try {
      console.log('Loading rundowns from database for user:', user.id);
      
      const { data, error } = await supabase
        .from('rundowns')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Database error loading rundowns:', error);
        throw error;
      }

      const rundowns = mapRundownsFromDatabase(data || []);
      setSavedRundowns(rundowns);
      console.log('Loaded rundowns from database:', rundowns.length);
    } catch (error) {
      console.error('Error loading rundowns:', error);
      setSavedRundowns([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Save rundown to Supabase
  const saveRundown = useCallback(async (rundown: SavedRundown): Promise<string> => {
    if (!user || !rundown) {
      throw new Error('User not authenticated or rundown is invalid');
    }

    setIsSaving(true);
    
    try {
      // Prepare rundown data - don't include id for new rundowns
      const rundownData = mapRundownToDatabase(rundown, user.id);
      
      // For new rundowns, remove the id field to let database generate it
      if (!rundown.id || rundown.id === '') {
        delete rundownData.id;
      }
      
      const { data, error } = await supabase
        .from('rundowns')
        .upsert(rundownData)
        .select()
        .single();

      if (error) {
        console.error('Database error saving rundown:', error);
        throw error;
      }

      const savedRundown = mapDatabaseToRundown(data);
      
      // Update local state
      setSavedRundowns(prevRundowns => {
        const existingIndex = prevRundowns.findIndex(r => r.id === savedRundown.id);
        if (existingIndex >= 0) {
          const newRundowns = [...prevRundowns];
          newRundowns[existingIndex] = savedRundown;
          return newRundowns;
        } else {
          return [savedRundown, ...prevRundowns];
        }
      });

      return savedRundown.id;
    } catch (error) {
      console.error('Error saving rundown:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  const operations = new RundownOperations(user, saveRundown, setSavedRundowns);

  useEffect(() => {
    loadRundowns();
  }, [loadRundowns]);

  return {
    savedRundowns,
    loading,
    isSaving,
    saveRundown,
    updateRundown: operations.updateRundown.bind(operations),
    deleteRundown: operations.deleteRundown.bind(operations),
    archiveRundown: operations.archiveRundown.bind(operations),
    duplicateRundown: operations.duplicateRundown.bind(operations),
    loadRundowns
  };
};
