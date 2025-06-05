
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

  // Load camera plot data from blueprint
  useEffect(() => {
    if (!user || !rundownId || isInitialized) return;
    
    const loadCameraPlotData = async () => {
      try {
        console.log('Camera plot data: Loading camera plots for rundown:', rundownId);
        const { data, error } = await supabase
          .from('blueprints')
          .select('*')
          .eq('user_id', user.id)
          .eq('rundown_id', rundownId)
          .maybeSingle();

        if (!error && data && data.camera_plots && Array.isArray(data.camera_plots) && data.camera_plots.length > 0) {
          console.log('Camera plot data: Loaded', data.camera_plots.length, 'camera plots');
          setPlots(data.camera_plots);
        } else {
          console.log('Camera plot data: No camera plots found in blueprint');
        }
      } catch (error) {
        console.error('Camera plot data: Error loading camera plot data:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadCameraPlotData();
  }, [rundownId, rundownTitle, user]);

  const reloadPlots = async () => {
    if (!user || !rundownId) return;
    
    try {
      console.log('Camera plot data: Reloading camera plots');
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (!error && data && data.camera_plots && Array.isArray(data.camera_plots)) {
        console.log('Camera plot data: Reloaded', data.camera_plots.length, 'camera plots');
        setPlots(data.camera_plots);
      }
    } catch (error) {
      console.error('Camera plot data: Error reloading camera plots:', error);
    }
  };

  return {
    plots,
    setPlots,
    isInitialized,
    reloadPlots,
    saveBlueprint // Return the passed saveBlueprint function directly
  };
};
