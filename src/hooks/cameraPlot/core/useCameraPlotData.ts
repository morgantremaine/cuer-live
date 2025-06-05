
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

export const useCameraPlotData = (
  rundownId: string, 
  rundownTitle: string, 
  readOnly = false,
  saveBlueprint?: (lists?: any[], silent?: boolean, notes?: string, crewData?: any[], cameraPlots?: any[]) => void
) => {
  const [plots, setPlots] = useState<CameraPlotScene[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const { user } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveStateRef = useRef<string>('');

  // Load camera plot data from blueprint
  useEffect(() => {
    if (!user || !rundownId || isInitialized) return;
    
    const loadCameraPlotData = async () => {
      try {
        const { data, error } = await supabase
          .from('blueprints')
          .select('*')
          .eq('user_id', user.id)
          .eq('rundown_id', rundownId)
          .maybeSingle();

        if (!error && data && data.camera_plots && Array.isArray(data.camera_plots) && data.camera_plots.length > 0) {
          setPlots(data.camera_plots);
        }
      } catch (error) {
        console.error('Error loading camera plot data:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadCameraPlotData();
  }, [rundownId, rundownTitle, user]);

  // Auto-save with debouncing using unified save function
  useEffect(() => {
    if (!isInitialized || readOnly || !saveBlueprint) return;

    const currentState = JSON.stringify(plots);
    if (currentState === lastSaveStateRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    lastSaveStateRef.current = currentState;

    saveTimeoutRef.current = setTimeout(() => {
      console.log('Camera plot: Auto-saving camera plots with', plots.length, 'scenes');
      saveBlueprint(undefined, true, undefined, undefined, plots);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [plots, isInitialized, readOnly, saveBlueprint]);

  const reloadPlots = async () => {
    if (!user || !rundownId) return;
    
    try {
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (!error && data && data.camera_plots && Array.isArray(data.camera_plots)) {
        setPlots(data.camera_plots);
      }
    } catch (error) {
      console.error('Error reloading camera plots:', error);
    }
  };

  // Unified saveBlueprint function for compatibility with useCameraPlotAutoSave
  const legacySaveBlueprint = async (lists?: any[], silent?: boolean, notes?: string, crewData?: any[], cameraPlots?: any[]) => {
    if (saveBlueprint) {
      await saveBlueprint(lists, silent, notes, crewData, cameraPlots);
    }
  };

  return {
    plots,
    setPlots,
    isInitialized,
    reloadPlots,
    saveBlueprint: legacySaveBlueprint
  };
};
