
import { useState, useEffect } from 'react';
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

export const useCameraPlot = (rundownId: string, rundownTitle: string) => {
  const [plots, setPlots] = useState<CameraPlotScene[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const { savedBlueprint, saveBlueprint } = useBlueprintStorage(rundownId);

  // Load saved plot data when blueprint is loaded
  useEffect(() => {
    if (savedBlueprint && !isInitialized) {
      if (savedBlueprint.camera_plots && Array.isArray(savedBlueprint.camera_plots)) {
        setPlots(savedBlueprint.camera_plots);
      }
      setIsInitialized(true);
    }
  }, [savedBlueprint, isInitialized]);

  // Auto-save plot data whenever it changes
  useEffect(() => {
    if (isInitialized && rundownId && rundownTitle) {
      const saveTimeout = setTimeout(() => {
        saveBlueprint(
          rundownTitle,
          savedBlueprint?.lists || [],
          savedBlueprint?.show_date,
          true, // silent save
          savedBlueprint?.notes,
          savedBlueprint?.crew_data,
          plots
        );
      }, 1000);

      return () => clearTimeout(saveTimeout);
    }
  }, [plots, isInitialized, rundownId, rundownTitle, savedBlueprint, saveBlueprint]);

  const createNewPlot = (name: string) => {
    const newPlot: CameraPlotScene = {
      id: `plot-${Date.now()}`,
      name,
      elements: []
    };
    setPlots([...plots, newPlot]);
  };

  const deletePlot = (plotId: string) => {
    setPlots(plots.filter(plot => plot.id !== plotId));
  };

  const duplicatePlot = (plotId: string) => {
    const plotToDuplicate = plots.find(plot => plot.id === plotId);
    if (plotToDuplicate) {
      const duplicatedPlot: CameraPlotScene = {
        ...plotToDuplicate,
        id: `plot-${Date.now()}`,
        name: `${plotToDuplicate.name} (Copy)`,
        elements: plotToDuplicate.elements.map(element => ({
          ...element,
          id: `element-${Date.now()}-${Math.random()}`
        }))
      };
      setPlots([...plots, duplicatedPlot]);
    }
  };

  const updatePlot = (plotId: string, updatedPlot: Partial<CameraPlotScene>) => {
    setPlots(plots.map(plot => 
      plot.id === plotId ? { ...plot, ...updatedPlot } : plot
    ));
  };

  const openPlotEditor = () => {
    const editorUrl = `/camera-plot-editor/${rundownId}`;
    window.open(editorUrl, '_blank');
  };

  return {
    plots,
    createNewPlot,
    deletePlot,
    duplicatePlot,
    updatePlot,
    openPlotEditor
  };
};
