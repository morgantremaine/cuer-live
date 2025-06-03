
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
  const { savedBlueprint, saveBlueprint, loadBlueprint } = useBlueprintStorage(rundownId);

  // Load saved plot data when blueprint is loaded
  useEffect(() => {
    const initializePlots = async () => {
      if (!isInitialized && rundownId && rundownTitle) {
        console.log('Initializing camera plots for rundown:', rundownId);
        
        // Ensure blueprint is loaded
        const blueprint = await loadBlueprint();
        
        if (blueprint && blueprint.camera_plots && Array.isArray(blueprint.camera_plots) && blueprint.camera_plots.length > 0) {
          console.log('Loading existing camera plots:', blueprint.camera_plots);
          setPlots(blueprint.camera_plots);
        } else {
          console.log('No existing camera plots found, will start with empty array');
          setPlots([]);
        }
        setIsInitialized(true);
      }
    };

    initializePlots();
  }, [rundownId, rundownTitle, loadBlueprint, isInitialized]);

  // Force reload data when coming back to a page
  const reloadPlots = async () => {
    console.log('Reloading camera plots data...');
    const blueprint = await loadBlueprint();
    if (blueprint && blueprint.camera_plots && Array.isArray(blueprint.camera_plots)) {
      console.log('Reloaded camera plots:', blueprint.camera_plots);
      setPlots(blueprint.camera_plots);
    } else {
      console.log('No camera plots found during reload');
      setPlots([]);
    }
  };

  // Auto-save plot data whenever it changes - but prevent excessive saves
  useEffect(() => {
    if (isInitialized && rundownId && rundownTitle && plots !== null) {
      console.log('Auto-saving camera plots:', plots);
      
      const saveTimeout = setTimeout(() => {
        saveBlueprint(
          rundownTitle,
          savedBlueprint?.lists || [],
          savedBlueprint?.show_date,
          true, // silent save
          savedBlueprint?.notes,
          savedBlueprint?.crew_data,
          plots // Save the camera plots
        );
      }, 1000);

      return () => clearTimeout(saveTimeout);
    }
  }, [plots, isInitialized, rundownId, rundownTitle, savedBlueprint, saveBlueprint]);

  const createNewPlot = (name: string) => {
    const newPlot: CameraPlotScene = {
      id: `plot-${Date.now()}-${Math.random()}`,
      name,
      elements: []
    };
    console.log('Creating new plot:', newPlot);
    setPlots(prevPlots => {
      const updatedPlots = [...prevPlots, newPlot];
      console.log('Updated plots after creation:', updatedPlots);
      return updatedPlots;
    });
    return newPlot;
  };

  const deletePlot = (plotId: string) => {
    console.log('Deleting plot:', plotId);
    setPlots(prevPlots => {
      const updatedPlots = prevPlots.filter(plot => plot.id !== plotId);
      console.log('Updated plots after deletion:', updatedPlots);
      return updatedPlots;
    });
  };

  const duplicatePlot = (plotId: string) => {
    const plotToDuplicate = plots.find(plot => plot.id === plotId);
    if (plotToDuplicate) {
      const duplicatedPlot: CameraPlotScene = {
        ...plotToDuplicate,
        id: `plot-${Date.now()}-${Math.random()}`,
        name: `${plotToDuplicate.name} (Copy)`,
        elements: plotToDuplicate.elements.map(element => ({
          ...element,
          id: `element-${Date.now()}-${Math.random()}`
        }))
      };
      console.log('Duplicating plot:', duplicatedPlot);
      setPlots(prevPlots => {
        const updatedPlots = [...prevPlots, duplicatedPlot];
        console.log('Updated plots after duplication:', updatedPlots);
        return updatedPlots;
      });
      return duplicatedPlot;
    }
  };

  const updatePlot = (plotId: string, updatedPlot: Partial<CameraPlotScene>) => {
    console.log('Updating plot:', plotId, 'with updates:', updatedPlot);
    setPlots(prevPlots => {
      const updatedPlots = prevPlots.map(plot => 
        plot.id === plotId ? { ...plot, ...updatedPlot } : plot
      );
      console.log('Updated plots after update:', updatedPlots);
      return updatedPlots;
    });
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
    openPlotEditor,
    reloadPlots
  };
};
