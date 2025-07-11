
import { useCameraPlotStateUnified } from './cameraPlot/core/useCameraPlotStateUnified';
import { useCameraPlotElements } from './cameraPlot/useCameraPlotElements';
import { snapToGrid } from './cameraPlot/utils/gridUtils';

export const useCameraPlotEditor = (rundownId: string) => {
  // Unified state management - eliminates conflicts
  const {
    scenes,
    activeScene,
    createScene,
    deleteScene,
    duplicateScene,
    setActiveScene,
    updateSceneName,
    updatePlot,
    selectedTool,
    selectedElements,
    showGrid,
    setSelectedTool,
    selectElement,
    toggleGrid,
    resetSelection,
    isDrawingWall,
    wallStart,
    wallPreview,
    startWallDrawing,
    updateWallPreview,
    completeWall,
    stopDrawingWalls
  } = useCameraPlotStateUnified(rundownId);

  // Element operations - simplified and direct
  const {
    addElement: baseAddElement,
    updateElement,
    deleteElement,
    duplicateElement
  } = useCameraPlotElements(activeScene, updatePlot, setSelectedTool);

  // Safe wrapper for addElement that checks for active scene
  const safeAddElement = (type: string, x: number, y: number) => {
    if (!activeScene) {
      console.log('No active scene available for element creation');
      return;
    }
    baseAddElement(type, x, y);
  };

  // Safe scene switching with cleanup
  const handleSetActiveScene = (sceneId: string) => {
    stopDrawingWalls(); // Clean wall state
    resetSelection(); // Clear selections
    setActiveScene(sceneId);
  };

  // Safe tool switching with cleanup
  const handleSetSelectedTool = (tool: string) => {
    if (tool !== 'wall') {
      stopDrawingWalls(); // Clean wall state when switching away
    }
    setSelectedTool(tool);
  };

  return {
    scenes,
    activeScene,
    selectedTool,
    selectedElements,
    isDrawingWall,
    wallStart,
    wallPreview,
    showGrid,
    setSelectedTool: handleSetSelectedTool,
    addElement: safeAddElement,
    updateElement,
    deleteElement,
    duplicateElement,
    selectElement,
    createScene,
    deleteScene,
    duplicateScene,
    setActiveScene: handleSetActiveScene,
    updateSceneName,
    updatePlot,
    toggleGrid,
    snapToGrid,
    // Wall drawing functions
    startWallDrawing,
    updateWallPreview,
    completeWall,
    stopDrawingWalls
  };
};
