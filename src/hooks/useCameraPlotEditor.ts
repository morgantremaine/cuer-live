
import { useCameraPlotState } from './cameraPlot/core/useCameraPlotState';
import { useCameraPlotInteractions } from './cameraPlot/interactions/useCameraPlotInteractions';
import { useCameraPlotEnhancedOperations } from './cameraPlot/operations/useCameraPlotEnhancedOperations';
import { useCameraPlotStateCoordination } from './cameraPlot/coordination/useCameraPlotStateCoordination';

export const useCameraPlotEditor = (rundownId: string) => {
  // Core state management
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
  } = useCameraPlotState(rundownId);

  // Element interactions
  const {
    snapToGrid,
    baseAddElement,
    updateElement,
    deleteElement,
    duplicateElement
  } = useCameraPlotInteractions(activeScene, scenes, updateSceneName, updatePlot);

  // Enhanced operations
  const { addElement } = useCameraPlotEnhancedOperations({
    selectedTool,
    isDrawingWall,
    wallStart,
    baseAddElement,
    startWallDrawing,
    completeWall,
    snapToGrid
  });

  // State coordination
  const {
    handleSetActiveScene,
    handleSetSelectedTool
  } = useCameraPlotStateCoordination({
    setActiveScene,
    setSelectedTool,
    resetSelection,
    stopDrawingWalls
  });

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
    updatePlot, // Expose the updatePlot function
    updateWallPreview,
    stopDrawingWalls,
    toggleGrid,
    snapToGrid
  };
};
