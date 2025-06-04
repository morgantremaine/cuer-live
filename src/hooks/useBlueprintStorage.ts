
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
  
  // Simplified state tracking
  const stateRef = useRef({
    lastLoadedRundownId: '',
    hasAttemptedLoad: false,
    isSaving: false
  });

  const loadBlueprint = async () => {
    if (!user || !rundownId || stateRef.current.isSaving) {
      console.log('Blueprint storage: Cannot load - missing user, rundownId, or currently saving');
      return savedBlueprint;
    }

    // Prevent duplicate loads for the same rundown
    if (rundownId === stateRef.current.lastLoadedRundownId && savedBlueprint !== null) {
      console.log('Blueprint storage: Already loaded for rundown:', rundownId);
      return savedBlueprint;
    }

    // Only attempt to load once per rundown
    if (rundownId === stateRef.current.lastLoadedRundownId && stateRef.current.hasAttemptedLoad) {
      console.log('Blueprint storage: Already attempted load for rundown:', rundownId);
      return savedBlueprint;
    }

    console.log('Blueprint storage: Loading blueprint for rundown:', rundownId);
    setLoading(true);
    stateRef.current.hasAttemptedLoad = true;
    
    try {
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (error) {
        console.error('Blueprint storage: Error loading:', error);
        toast({
          title: "Error",
          description: "Failed to load blueprint data",
          variant: "destructive"
        });
        return null;
      }

      console.log('Blueprint storage: Loaded from database:', data ? `${data.lists.length} lists` : 'no blueprint found');
      
      if (data) {
        setSavedBlueprint(data);
        stateRef.current.lastLoadedRundownId = rundownId;
      } else {
        setSavedBlueprint(null);
      }
      
      return data;
    } catch (error) {
      console.error('Blueprint storage: Exception loading:', error);
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
    if (!user || !rundownId || stateRef.current.isSaving) {
      console.log('Blueprint storage: Cannot save - missing user, rundownId, or already saving');
      return;
    }

    console.log('Blueprint storage: Saving', lists.length, 'lists');
    stateRef.current.isSaving = true;

    try {
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

      // Only include camera_plots if explicitly provided
      if (cameraPlots !== undefined) {
        blueprintData.camera_plots = cameraPlots;
      }

      let result;
      
      if (savedBlueprint) {
        const { data, error } = await supabase
          .from('blueprints')
          .update(blueprintData)
          .eq('id', savedBlueprint.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
        console.log('Blueprint storage: Updated successfully');
      } else {
        const { data, error } = await supabase
          .from('blueprints')
          .insert(blueprintData)
          .select()
          .single();

        if (error) throw error;
        result = data;
        console.log('Blueprint storage: Created successfully');
      }
      
      setSavedBlueprint(result);
      stateRef.current.lastLoadedRundownId = rundownId;

      if (!silent) {
        toast({
          title: 'Success',
          description: 'Blueprint saved successfully!',
        });
      }
      
      return result;
    } catch (error) {
      console.error('Blueprint storage: Save error:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to save blueprint',
          variant: 'destructive',
        });
      }
      return null;
    } finally {
      stateRef.current.isSaving = false;
    }
  };

  // Reset state when rundown changes
  useEffect(() => {
    if (rundownId !== stateRef.current.lastLoadedRundownId) {
      console.log('Blueprint storage: Rundown changed, resetting state');
      setSavedBlueprint(null);
      stateRef.current.hasAttemptedLoad = false;
    }
  }, [rundownId]);

  // Load blueprint once when conditions are met
  useEffect(() => {
    if (user && rundownId && !stateRef.current.hasAttemptedLoad && !loading) {
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
