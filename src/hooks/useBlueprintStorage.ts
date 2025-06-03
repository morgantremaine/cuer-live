
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { BlueprintList } from '@/types/blueprint';
import { useToast } from '@/hooks/use-toast';

interface CrewMember {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string;
}

interface SavedBlueprint {
  id: string;
  user_id: string;
  rundown_id: string;
  rundown_title: string;
  lists: BlueprintList[];
  show_date?: string;
  notes?: string;
  crew_data?: CrewMember[];
  camera_plots?: any[];
  created_at: string;
  updated_at: string;
}

export const useBlueprintStorage = (rundownId: string) => {
  const [savedBlueprint, setSavedBlueprint] = useState<SavedBlueprint | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadBlueprint = async () => {
    if (!user || !rundownId) {
      return savedBlueprint;
    }

    setLoading(true);
    
    try {
      console.log('Loading blueprint from database for rundown:', rundownId);
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

      console.log('Loaded blueprint data:', data ? 'found' : 'not found');
      setSavedBlueprint(data);
      return data;
    } catch (error) {
      console.error('Error loading blueprint:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const saveBlueprint = async (
    rundownTitle: string, 
    lists: BlueprintList[], 
    showDate?: string, 
    silent = false, 
    notes?: string,
    crewData?: CrewMember[],
    cameraPlots?: any[]
  ) => {
    if (!user || !rundownId) {
      console.error('Cannot save blueprint: missing user or rundownId');
      return;
    }

    try {
      const blueprintData = {
        user_id: user.id,
        rundown_id: rundownId,
        rundown_title: rundownTitle,
        lists: lists,
        show_date: showDate,
        notes: notes || null,
        crew_data: crewData || null,
        camera_plots: cameraPlots || null,
        updated_at: new Date().toISOString()
      };

      console.log('Saving blueprint with camera plots:', cameraPlots?.length || 0, 'scenes');

      if (savedBlueprint) {
        // Update existing blueprint
        const { data, error } = await supabase
          .from('blueprints')
          .update(blueprintData)
          .eq('id', savedBlueprint.id)
          .eq('user_id', user.id)
          .select()
          .single();

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

        setSavedBlueprint(data);
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
