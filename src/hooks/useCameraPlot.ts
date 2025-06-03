
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

  // Load saved plot data when blueprint is loaded
  useEffect(() => {
    const initializePlots = async () => {
      if (!isInitialized && rundownId && rundownTitle) {
        console.log(`Initializing camera plots for rundown: ${rundownId} ${readOnly ? '(read-only)' : '(editor)'}`);
        
        // Force fresh load from database
        const blueprint = await loadBlueprint();
        
        // Check if camera_plots exists and is a valid array
        if (blueprint?.camera_plots && Array.isArray(blueprint.camera_plots) && blueprint.camera_plots.length > 0) {
          console.log('Loading existing camera plots:', blueprint.camera_plots.length, 'scenes');
          setPlots(blueprint.camera_plots);
          lastSavedPlotsRef.current = JSON.stringify(blueprint.camera_plots);
        } else {
          // Only initialize empty array if we're in editor mode, not read-only
          if (!readOnly) {
            console.log('No existing camera plots found, starting with empty array');
            setPlots([]);
            lastSavedPlotsRef.current = JSON.stringify([]);
          } else {
            console.log('Read-only mode: No camera plots found, keeping empty state');
            setPlots([]);
            // Don't update lastSavedPlotsRef in read-only mode to prevent overwriting
          }
        }
        setIsInitialized(true);
      }
    };

    initializePlots();
  }, [rundownId, rundownTitle, loadBlueprint, isInitialized, readOnly]);

  // Force reload data when coming back to a page
  const reloadPlots = async () => {
    console.log('Reloading camera plots data...');
    const blueprint = await loadBlueprint();
    if (blueprint?.camera_plots && Array.isArray(blueprint.camera_plots) && blueprint.camera_plots.length > 0) {
      console.log('Reloaded camera plots:', blueprint.camera_plots.length, 'scenes');
      setPlots(blueprint.camera_plots);
      if (!readOnly) {
        lastSavedPlotsRef.current = JSON.stringify(blueprint.camera_plots);
      }
    } else {
      console.log('No camera plots found during reload');
      setPlots([]);
      // Don't update lastSavedPlotsRef in read-only mode
      if (!readOnly) {
        lastSavedPlotsRef.current = JSON.stringify([]);
      }
    }
  };

  // Debounced auto-save plot data (only for editor, not read-only mode)
  useEffect(() => {
    if (!readOnly && isInitialized && rundownId && rundownTitle && plots !== null) {
      const currentPlotsString = JSON.stringify(plots);
      
      // Only save if data has actually changed
      if (currentPlotsString !== lastSavedPlotsRef.current) {
        console.log('Scheduling auto-save for camera plots with', plots.length, 'scenes');
        
        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        
        // Set new timeout with shorter delay for faster syncing
        autoSaveTimeoutRef.current = setTimeout(async () => {
          try {
            console.log('Executing auto-save for camera plots');
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
            console.log('Auto-save completed successfully');
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
    if (readOnly) return null; // Don't allow creation in read-only mode
    
    const newPlot: CameraPlotScene = {
      id: `plot-${Date.now()}-${Math.random()}`,
      name,
      elements: []
    };
    console.log('Creating new plot:', newPlot.name);
    setPlots(prevPlots => {
      const updatedPlots = [...prevPlots, newPlot];
      console.log('Updated plots after creation:', updatedPlots.length, 'total scenes');
      return updatedPlots;
    });
    return newPlot;
  };

  const deletePlot = (plotId: string) => {
    if (readOnly) return; // Don't allow deletion in read-only mode
    
    console.log('Deleting plot:', plotId);
    setPlots(prevPlots => {
      const updatedPlots = prevPlots.filter(plot => plot.id !== plotId);
      console.log('Updated plots after deletion:', updatedPlots.length, 'remaining scenes');
      return updatedPlots;
    });
  };

  const duplicatePlot = (plotId: string) => {
    if (readOnly) return null; // Don't allow duplication in read-only mode
    
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
      console.log('Duplicating plot:', duplicatedPlot.name);
      setPlots(prevPlots => {
        const updatedPlots = [...prevPlots, duplicatedPlot];
        console.log('Updated plots after duplication:', updatedPlots.length, 'total scenes');
        return updatedPlots;
      });
      return duplicatedPlot;
    }
  };

  const updatePlot = (plotId: string, updatedPlot: Partial<CameraPlotScene>) => {
    if (readOnly) return; // Don't allow updates in read-only mode
    
    console.log('Updating plot:', plotId, 'with', Object.keys(updatedPlot).join(', '));
    setPlots(prevPlots => {
      const updatedPlots = prevPlots.map(plot => 
        plot.id === plotId ? { ...plot, ...updatedPlot } : plot
      );
      console.log('Updated plots after update:', updatedPlots.length, 'total scenes');
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
