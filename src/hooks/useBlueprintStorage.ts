
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
  
  // Use a ref to track the last loaded blueprint to prevent duplicate loads
  const lastLoadedRundownRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const loadAttemptedRef = useRef(false);

  const loadBlueprint = async () => {
    // Check for conditions that would prevent loading
    if (!user || !rundownId || isSavingRef.current) {
      return savedBlueprint;
    }

    // Don't reload the same rundown if we already have it
    if (rundownId === lastLoadedRundownRef.current && savedBlueprint !== null) {
      console.log('Blueprint already loaded for rundown:', rundownId);
      return savedBlueprint;
    }

    // Mark that we've attempted to load
    loadAttemptedRef.current = true;
    setLoading(true);
    
    try {
      console.log('Loading blueprint for rundown:', rundownId);
      
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (error) {
        console.error('Error loading blueprint:', error);
        toast({
          title: "Error",
          description: "Failed to load blueprint data",
          variant: "destructive"
        });
        return null;
      }

      console.log('Blueprint loaded from database:', data ? `${data.lists.length} lists` : 'no blueprint found');
      
      if (data) {
        setSavedBlueprint(data);
        lastLoadedRundownRef.current = rundownId;
      } else {
        setSavedBlueprint(null);
      }
      
      return data;
    } catch (error) {
      console.error('Exception loading blueprint:', error);
      toast({
        title: "Error",
        description: "Failed to load blueprint data",
        variant: "destructive"
      });
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
    
    if (isSavingRef.current) {
      console.log('Save operation already in progress, skipping');
      return;
    }

    console.log('Saving blueprint with', lists.length, 'lists to database');
    isSavingRef.current = true;

    try {
      // CRITICAL: Only include camera_plots in the update if it's explicitly provided
      // This prevents accidentally overwriting camera plot data when saving other blueprint data
      const blueprintData: any = {
        user_id: user.id,
        rundown_id: rundownId,
        rundown_title: rundownTitle,
        lists: lists,
        show_date: showDate,
        notes: notes || null,
        crew_data: crewData || null,
        updated_at: new Date().toISOString()
      };

      // Only include camera_plots if it's explicitly provided
      if (cameraPlots !== undefined) {
        blueprintData.camera_plots = cameraPlots;
      }

      let result;
      
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
          throw new Error(`Error updating blueprint: ${error.message}`);
        }

        console.log('Blueprint updated successfully with', data.lists.length, 'lists');
        result = data;
      } else {
        // Create new blueprint
        const { data, error } = await supabase
          .from('blueprints')
          .insert(blueprintData)
          .select()
          .single();

        if (error) {
          throw new Error(`Error creating blueprint: ${error.message}`);
        }

        console.log('Blueprint created successfully with', data.lists.length, 'lists');
        result = data;
      }
      
      // Update our state with the latest data from the database
      setSavedBlueprint(result);
      lastLoadedRundownRef.current = rundownId;

      if (!silent) {
        toast({
          title: 'Success',
          description: 'Blueprint saved successfully!',
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error saving blueprint:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to save blueprint',
          variant: 'destructive',
        });
      }
      return null;
    } finally {
      isSavingRef.current = false;
    }
  };

  // Reset when rundown changes
  useEffect(() => {
    // Only reset if we're switching to a new rundown
    if (rundownId !== lastLoadedRundownRef.current) {
      setSavedBlueprint(null);
      loadAttemptedRef.current = false;
    }
  }, [rundownId]);

  // Load blueprint once when component mounts or rundownId changes
  useEffect(() => {
    if (user && rundownId && !loadAttemptedRef.current) {
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
