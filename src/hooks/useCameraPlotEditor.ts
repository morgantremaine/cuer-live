
import { useCameraPlotScenes } from '@/hooks/cameraPlot/useCameraPlotScenes';
import { useCameraPlotTools } from '@/hooks/cameraPlot/useCameraPlotTools';
import { useCameraPlotWalls } from '@/hooks/cameraPlot/useCameraPlotWalls';
import { useCameraPlotElements } from '@/hooks/cameraPlot/useCameraPlotElements';

export const useCameraPlotEditor = (rundownId: string) => {
  const {
    scenes,
    activeScene,
    createScene,
    deleteScene,
    duplicateScene,
    setActiveScene,
    updateSceneName
  } = useCameraPlotScenes(rundownId);

  const {
    selectedTool,
    selectedElements,
    showGrid,
    setSelectedTool,
    selectElement,
    toggleGrid,
    resetSelection
  } = useCameraPlotTools();

  const {
    isDrawingWall,
    wallStart,
    startWallDrawing,
    stopDrawingWalls
  } = useCameraPlotWalls();

  const {
    snapToGrid,
    addElement: baseAddElement,
    updateElement,
    deleteElement,
    duplicateElement
  } = useCameraPlotElements(activeScene, (plotId, updates) => {
    // This will be handled by the scene management hook
    const sceneToUpdate = scenes.find(s => s.id === plotId);
    if (sceneToUpdate) {
      // Update through the scene management system
      updateSceneName(plotId, updates.name || sceneToUpdate.name);
      // For elements, we need to pass this through
      if (updates.elements) {
        // Direct update to the plot storage
        const plot = scenes.find(s => s.id === plotId);
        if (plot && 'updatePlot' in plot) {
          (plot as any).updatePlot(plotId, updates);
        }
      }
    }
  });

  // Enhanced addElement that handles wall drawing
  const addElement = (type: string, x: number, y: number) => {
    if (type === 'wall') {
      if (!isDrawingWall) {
        const snapped = snapToGrid(x, y);
        startWallDrawing(snapped);
        return;
      } else if (wallStart) {
        baseAddElement(type, x, y, wallStart, () => {
          const snapped = snapToGrid(x, y);
          startWallDrawing(snapped); // Continue drawing from end point
        });
        return;
      }
    }

    baseAddElement(type, x, y);
  };

  // Enhanced setActiveScene that resets selection and wall drawing
  const handleSetActiveScene = (sceneId: string) => {
    setActiveScene(sceneId);
    resetSelection();
    stopDrawingWalls();
  };

  // Enhanced setSelectedTool that stops wall drawing when switching tools
  const handleSetSelectedTool = (tool: string) => {
    setSelectedTool(tool);
    if (tool !== 'wall') {
      stopDrawingWalls();
    }
  };

  return {
    scenes,
    activeScene,
    selectedTool,
    selectedElements,
    isDrawingWall,
    wallStart,
    showGrid,
    setSelectedTool: handleSetSelectedTool,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    selectElement,
    createScene,
    deleteScene,
    duplicateScene,
    setActiveScene: handleSetActiveScene,
    updateSceneName,
    stopDrawingWalls,
    toggleGrid,
    snapToGrid
  };
};
