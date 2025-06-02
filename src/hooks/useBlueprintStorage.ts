
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { BlueprintList } from '@/types/blueprint';
import { useToast } from '@/hooks/use-toast';

interface SavedBlueprint {
  id: string;
  user_id: string;
  rundown_id: string;
  rundown_title: string;
  lists: BlueprintList[];
  show_date?: string;
  created_at: string;
  updated_at: string;
}

export const useBlueprintStorage = (rundownId: string) => {
  const [savedBlueprint, setSavedBlueprint] = useState<SavedBlueprint | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadBlueprint = async () => {
    if (!user || !rundownId) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (error) {
        console.error('Error loading blueprint:', error);
        return null;
      }

      setSavedBlueprint(data);
      return data;
    } catch (error) {
      console.error('Error loading blueprint:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const saveBlueprint = async (rundownTitle: string, lists: BlueprintList[], showDate?: string, silent = false) => {
    if (!user || !rundownId) return;

    try {
      const blueprintData = {
        user_id: user.id,
        rundown_id: rundownId,
        rundown_title: rundownTitle,
        lists: lists,
        show_date: showDate,
        updated_at: new Date().toISOString()
      };

      if (savedBlueprint) {
        // Update existing blueprint
        const { error } = await supabase
          .from('blueprints')
          .update(blueprintData)
          .eq('id', savedBlueprint.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating blueprint:', error);
          if (!silent) {
            toast({
              title: 'Error',
              description: 'Failed to save blueprint',
              variant: 'destructive',
            });
          }
          return;
        }
      } else {
        // Create new blueprint
        const { data, error } = await supabase
          .from('blueprints')
          .insert(blueprintData)
          .select()
          .single();

        if (error) {
          console.error('Error creating blueprint:', error);
          if (!silent) {
            toast({
              title: 'Error',
              description: 'Failed to save blueprint',
              variant: 'destructive',
            });
          }
          return;
        }

        setSavedBlueprint(data);
      }

      if (!silent) {
        toast({
          title: 'Success',
          description: 'Blueprint saved successfully!',
        });
      }
    } catch (error) {
      console.error('Error saving blueprint:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to save blueprint',
          variant: 'destructive',
        });
      }
    }
  };

  useEffect(() => {
    if (user && rundownId) {
      loadBlueprint();
    }
  }, [user, rundownId]);

  return {
    savedBlueprint,
    loading,
    saveBlueprint,
    loadBlueprint
  };
};
