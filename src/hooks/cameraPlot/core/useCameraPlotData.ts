
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CameraElement {
  id: string;
  type: "camera" | "person" | "wall" | "furniture" | "light" | "prop";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  label: string;
  // Additional properties for wall elements
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

export interface CameraPlotScene {
  id: string;
  name: string;
  elements: CameraElement[];
  createdAt: string;
  updatedAt: string;
}

export interface CameraPlotData {
  scenes: CameraPlotScene[];
  activeSceneId: string | null;
}

export const useCameraPlotData = (rundownId: string, rundownTitle: string, readOnly: boolean = false) => {
  const [plots, setPlots] = useState<CameraPlotData>({ scenes: [], activeSceneId: null });
  const [isInitialized, setIsInitialized] = useState(false);

  const loadPlots = async () => {
    try {
      const { data, error } = await supabase
        .from('blueprints')
        .select('camera_plots')
        .eq('rundown_id', rundownId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading camera plots:', error);
        return;
      }

      if (data?.camera_plots) {
        const parsedPlots = data.camera_plots as CameraPlotData;
        setPlots(parsedPlots);
        
        // Set first scene as active if none is set
        if (!parsedPlots.activeSceneId && parsedPlots.scenes.length > 0) {
          setPlots(prev => ({
            ...prev,
            activeSceneId: parsedPlots.scenes[0].id
          }));
        }
      } else {
        // Initialize with default scene
        const defaultScene: CameraPlotScene = {
          id: `scene-${Date.now()}`,
          name: 'Scene 1',
          elements: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const initialPlots: CameraPlotData = {
          scenes: [defaultScene],
          activeSceneId: defaultScene.id
        };
        
        setPlots(initialPlots);
      }
    } catch (error) {
      console.error('Error in loadPlots:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  const reloadPlots = () => {
    setIsInitialized(false);
    loadPlots();
  };

  useEffect(() => {
    loadPlots();
  }, [rundownId]);

  return {
    plots,
    setPlots,
    isInitialized,
    reloadPlots
  };
};
