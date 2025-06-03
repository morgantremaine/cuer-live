
import { useState, useEffect, useRef } from 'react';
import { useBlueprintStorage } from '@/hooks/useBlueprintStorage';

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
  const initializationRef = useRef(false);
  const { savedBlueprint, saveBlueprint, loadBlueprint } = useBlueprintStorage(rundownId);

  // Load saved plot data when blueprint is loaded
  useEffect(() => {
    const initializePlots = async () => {
      if (!initializationRef.current && rundownId && rundownTitle) {
        initializationRef.current = true;
        
        const blueprint = await loadBlueprint();
        
        if (blueprint?.camera_plots && Array.isArray(blueprint.camera_plots) && blueprint.camera_plots.length > 0) {
          console.log('Loading camera plots from blueprint:', blueprint.camera_plots.length);
          setPlots(blueprint.camera_plots);
        } else {
          setPlots([]);
        }
        setIsInitialized(true);
      }
    };

    initializePlots();
  }, [rundownId, rundownTitle, loadBlueprint]);

  const reloadPlots = async () => {
    const blueprint = await loadBlueprint();
    if (blueprint?.camera_plots && Array.isArray(blueprint.camera_plots) && blueprint.camera_plots.length > 0) {
      console.log('Reloading camera plots from blueprint:', blueprint.camera_plots.length);
      setPlots(blueprint.camera_plots);
    } else {
      setPlots([]);
    }
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
