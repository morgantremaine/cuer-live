
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

  // Enhanced saveBlueprint function that properly integrates with blueprint saving
  const saveBlueprint = (title: string, lists: any[], showDate?: string, silent?: boolean, notes?: string, crewData?: any[], cameraPlots?: any[]) => {
    console.log('Camera plot saveBlueprint called with:', { title, cameraPlots: cameraPlots?.length });
    
    // Create updated blueprint data with camera plots
    const updatedBlueprint = {
      ...savedBlueprint,
      rundown_title: title,
      lists: lists || [],
      show_date: showDate,
      notes: notes,
      crew_data: crewData,
      camera_plots: cameraPlots || plots // Use provided camera plots or current plots
    };

    setSavedBlueprint(updatedBlueprint);

    // Here we would normally call the actual blueprint persistence
    // This will be handled by the parent Blueprint component through the blueprint state
    if (!silent) {
      console.log('Camera plots saved successfully');
    }
  };

  // Load saved plot data when blueprint is loaded
  useEffect(() => {
    if (!initializationRef.current && rundownId && rundownTitle) {
      initializationRef.current = true;
      
      // Load existing camera plots from savedBlueprint if available
      if (savedBlueprint?.camera_plots) {
        setPlots(savedBlueprint.camera_plots);
      }
      
      setIsInitialized(true);
    }
  }, [rundownId, rundownTitle, savedBlueprint]);

  const reloadPlots = async () => {
    // Reload from savedBlueprint if available
    if (savedBlueprint?.camera_plots) {
      setPlots(savedBlueprint.camera_plots);
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
