
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface CameraElement {
  id: string;
  type: 'camera' | 'person' | 'wall' | 'furniture';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  label: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
  cameraNumber?: number;
}

export interface CameraPlotScene {
  id: string;
  name: string;
  elements: CameraElement[];
}

export interface CameraPlotData {
  id: string;
  scenes: CameraPlotScene[];
  activeSceneId: string;
}

export const useCameraPlotData = (rundownId: string, rundownTitle: string, readOnly = false) => {
  const [plots, setPlots] = useState<CameraPlotScene[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [savedBlueprint, setSavedBlueprint] = useState<any>(null);
  const { user } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isSavingRef = useRef(false);
  const initializationRef = useRef(false);
  const lastSaveStateRef = useRef<string>('');

  // Load camera plot data from blueprint
  useEffect(() => {
    if (!initializationRef.current && rundownId && rundownTitle && user) {
      initializationRef.current = true;
      
      const loadCameraPlotData = async () => {
        try {
          const { data, error } = await supabase
            .from('blueprints')
            .select('*')
            .eq('user_id', user.id)
            .eq('rundown_id', rundownId)
            .maybeSingle();

          if (!error && data) {
            setSavedBlueprint(data);
            if (data.camera_plots && Array.isArray(data.camera_plots) && data.camera_plots.length > 0) {
              setPlots(data.camera_plots);
            }
          }
        } catch (error) {
          console.error('Error loading camera plot data:', error);
        } finally {
          setIsInitialized(true);
        }
      };

      loadCameraPlotData();
    }
  }, [rundownId, rundownTitle, user]);

  // Optimized auto-save with state comparison
  useEffect(() => {
    if (!isInitialized || readOnly || !user || !rundownId || isSavingRef.current) return;

    const currentState = JSON.stringify(plots);
    if (currentState === lastSaveStateRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!isSavingRef.current) {
        isSavingRef.current = true;
        lastSaveStateRef.current = currentState;
        
        try {
          const blueprintData = {
            user_id: user.id,
            rundown_id: rundownId,
            rundown_title: rundownTitle,
            lists: savedBlueprint?.lists || [],
            show_date: savedBlueprint?.show_date,
            notes: savedBlueprint?.notes,
            crew_data: savedBlueprint?.crew_data,
            camera_plots: plots,
            updated_at: new Date().toISOString()
          };

          if (savedBlueprint) {
            const { error } = await supabase
              .from('blueprints')
              .update(blueprintData)
              .eq('id', savedBlueprint.id)
              .eq('user_id', user.id);

            if (error) throw error;
          } else {
            const { data, error } = await supabase
              .from('blueprints')
              .insert(blueprintData)
              .select()
              .single();

            if (error) throw error;
            setSavedBlueprint(data);
          }
        } catch (error) {
          console.error('Error auto-saving camera plot data:', error);
        } finally {
          isSavingRef.current = false;
        }
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [plots, isInitialized, rundownId, rundownTitle, readOnly, savedBlueprint, user]);

  const reloadPlots = async () => {
    if (!user || !rundownId) return;
    
    try {
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (!error && data) {
        setSavedBlueprint(data);
        if (data.camera_plots && Array.isArray(data.camera_plots)) {
          setPlots(data.camera_plots);
        }
      }
    } catch (error) {
      console.error('Error reloading camera plots:', error);
    }
  };

  // Legacy saveBlueprint function for compatibility
  const saveBlueprint = async (title: string, lists: any[], showDate?: string, silent?: boolean, notes?: string, crewData?: any[], cameraPlots?: any[]) => {
    // This function is kept for compatibility but the auto-save above handles the actual saving
  };

  return {
    plots,
    setPlots,
    isInitialized,
    reloadPlots,
    savedBlueprint,
    saveBlueprint
  };
};
