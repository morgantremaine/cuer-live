
import { useState, useEffect, useRef } from 'react';

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
  const initializationRef = useRef(false);

  // Simple camera plot storage functions
  const loadBlueprint = async () => {
    // This will be handled by the parent Blueprint component
    return savedBlueprint;
  };

  const saveBlueprint = (title: string, lists: any[], showDate?: string, silent?: boolean, notes?: string, crewData?: any[], cameraPlots?: any[]) => {
    // This will be handled by the parent Blueprint component
  };

  // Load saved plot data when blueprint is loaded
  useEffect(() => {
    if (!initializationRef.current && rundownId && rundownTitle) {
      initializationRef.current = true;
      setPlots([]);
      setIsInitialized(true);
    }
  }, [rundownId, rundownTitle]);

  const reloadPlots = async () => {
    // This will be handled by the parent Blueprint component
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
