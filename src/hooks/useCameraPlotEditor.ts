
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

  // Remove the noisy log that was running constantly
  // console.log('useCameraPlotEditor - activeScene:', activeScene?.id, 'scenes:', scenes.length);

  // Element interactions - only initialize if we have an active scene
  const {
    snapToGrid,
    baseAddElement,
    updateElement,
    deleteElement,
    duplicateElement
  } = useCameraPlotInteractions(activeScene, scenes, updateSceneName, updatePlot, setSelectedTool);

  // Enhanced operations with setSelectedTool integration - only if active scene exists
  const { addElement } = useCameraPlotEnhancedOperations({
    selectedTool,
    isDrawingWall,
    wallStart,
    baseAddElement,
    startWallDrawing,
    completeWall,
    snapToGrid,
    activeScene,
    updatePlot,
    setSelectedTool
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

  // Safe wrapper for addElement that checks for active scene
  const safeAddElement = (type: string, x: number, y: number) => {
    if (!activeScene) {
      console.log('No active scene available for element creation');
      return;
    }
    addElement(type, x, y);
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
    updateWallPreview,
    stopDrawingWalls,
    toggleGrid,
    snapToGrid
  };
};
