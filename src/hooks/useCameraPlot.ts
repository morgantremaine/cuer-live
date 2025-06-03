
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

export const useCameraPlot = (rundownId: string, rundownTitle: string, readOnly = false) => {
  const [plots, setPlots] = useState<CameraPlotScene[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const { savedBlueprint, saveBlueprint, loadBlueprint } = useBlueprintStorage(rundownId);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedPlotsRef = useRef<string>('');
  const lastLoggedActiveSceneRef = useRef<string>('');

  // Load saved plot data when blueprint is loaded
  useEffect(() => {
    const initializePlots = async () => {
      if (!isInitialized && rundownId && rundownTitle) {
        // Force fresh load from database
        const blueprint = await loadBlueprint();
        
        // Check if camera_plots exists and is a valid array
        if (blueprint?.camera_plots && Array.isArray(blueprint.camera_plots) && blueprint.camera_plots.length > 0) {
          setPlots(blueprint.camera_plots);
          if (!readOnly) {
            lastSavedPlotsRef.current = JSON.stringify(blueprint.camera_plots);
          }
        } else {
          // Only initialize empty array if we're in editor mode, not read-only
          if (!readOnly) {
            setPlots([]);
            lastSavedPlotsRef.current = JSON.stringify([]);
          } else {
            setPlots([]);
          }
        }
        setIsInitialized(true);
      }
    };

    initializePlots();
  }, [rundownId, rundownTitle, loadBlueprint, isInitialized, readOnly]);

  // Force reload data when coming back to a page
  const reloadPlots = async () => {
    const blueprint = await loadBlueprint();
    if (blueprint?.camera_plots && Array.isArray(blueprint.camera_plots) && blueprint.camera_plots.length > 0) {
      setPlots(blueprint.camera_plots);
      if (!readOnly) {
        lastSavedPlotsRef.current = JSON.stringify(blueprint.camera_plots);
      }
    } else {
      setPlots([]);
      if (!readOnly) {
        lastSavedPlotsRef.current = JSON.stringify([]);
      }
    }
  };

  // Debounced auto-save plot data (ONLY FOR EDITOR, NEVER FOR READ-ONLY MODE)
  useEffect(() => {
    // CRITICAL: Never save in read-only mode
    if (readOnly) {
      return;
    }

    if (isInitialized && rundownId && rundownTitle && plots !== null) {
      const currentPlotsString = JSON.stringify(plots);
      
      // Only save if data has actually changed
      if (currentPlotsString !== lastSavedPlotsRef.current) {
        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        
        // Set new timeout with shorter delay for faster syncing
        autoSaveTimeoutRef.current = setTimeout(async () => {
          try {
            lastSavedPlotsRef.current = currentPlotsString;
            await saveBlueprint(
              rundownTitle,
              savedBlueprint?.lists || [],
              savedBlueprint?.show_date,
              true, // silent save
              savedBlueprint?.notes,
              savedBlueprint?.crew_data,
              plots // Save the camera plots
            );
          } catch (error) {
            console.error('Auto-save failed:', error);
          }
        }, 50); // Very fast auto-save for immediate syncing
      }
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [plots, isInitialized, rundownId, rundownTitle, savedBlueprint, saveBlueprint, readOnly]);

  const createNewPlot = (name: string) => {
    if (readOnly) {
      return null;
    }
    
    const newPlot: CameraPlotScene = {
      id: `plot-${Date.now()}-${Math.random()}`,
      name,
      elements: []
    };
    setPlots(prevPlots => {
      const updatedPlots = [...prevPlots, newPlot];
      return updatedPlots;
    });
    return newPlot;
  };

  const deletePlot = (plotId: string) => {
    if (readOnly) {
      return;
    }
    
    setPlots(prevPlots => {
      const updatedPlots = prevPlots.filter(plot => plot.id !== plotId);
      return updatedPlots;
    });
  };

  const duplicatePlot = (plotId: string) => {
    if (readOnly) {
      return null;
    }
    
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
      setPlots(prevPlots => {
        const updatedPlots = [...prevPlots, duplicatedPlot];
        return updatedPlots;
      });
      return duplicatedPlot;
    }
  };

  const updatePlot = (plotId: string, updatedPlot: Partial<CameraPlotScene>) => {
    if (readOnly) {
      return;
    }
    
    setPlots(prevPlots => {
      const updatedPlots = prevPlots.map(plot => 
        plot.id === plotId ? { ...plot, ...updatedPlot } : plot
      );
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
