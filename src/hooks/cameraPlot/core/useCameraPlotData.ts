import { useState, useEffect, useRef } from 'react';
import { useBlueprintPersistence } from '@/hooks/blueprint/useBlueprintPersistence';

export interface CameraElement {
  id: string;
  type: 'camera' | 'person' | 'wall' | 'furniture' | 'microphone';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  label: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelHidden?: boolean;
  cameraNumber?: number;
  color?: string;
  personColor?: 'blue' | 'green' | 'red' | 'yellow';
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
  const initializationRef = useRef(false);

  // Get blueprint persistence functions - this now handles team vs user blueprints automatically
  const { loadBlueprint, saveBlueprint } = useBlueprintPersistence(
    rundownId,
    rundownTitle,
    '', // showDate not needed for camera plots
    savedBlueprint,
    setSavedBlueprint
  );

  // Load saved plot data when blueprint is loaded
  useEffect(() => {
    if (!initializationRef.current && rundownId && rundownTitle) {
      initializationRef.current = true;
      
      const initializePlots = async () => {
        try {
          const blueprintData = await loadBlueprint();
          if (blueprintData?.camera_plots && Array.isArray(blueprintData.camera_plots)) {
            setPlots(blueprintData.camera_plots);
          } else {
            setPlots([]);
          }
        } catch (error) {
          setPlots([]);
        } finally {
          setIsInitialized(true);
        }
      };
      
      initializePlots();
    }
  }, [rundownId, rundownTitle, loadBlueprint]);

  const reloadPlots = async () => {
    try {
      const blueprintData = await loadBlueprint();
      if (blueprintData?.camera_plots && Array.isArray(blueprintData.camera_plots)) {
        setPlots(blueprintData.camera_plots);
      }
    } catch (error) {
      // Silent error handling
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
