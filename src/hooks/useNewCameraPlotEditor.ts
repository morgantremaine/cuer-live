
import { useCameraPlotState } from './cameraPlot/core/useCameraPlotState';
import { useCameraPlotInteractions } from './cameraPlot/interactions/useCameraPlotInteractions';
import { useCameraPlotEnhancedOperations } from './cameraPlot/operations/useCameraPlotEnhancedOperations';
import { useCameraPlotStateCoordination } from './cameraPlot/coordination/useCameraPlotStateCoordination';
import { useBlueprintDataManager } from './blueprint/useBlueprintDataManager';
import { useEffect, useCallback } from 'react';

export const useNewCameraPlotEditor = (rundownId: string) => {
  // Get the blueprint data manager to sync with central state
  const blueprintManager = useBlueprintDataManager(rundownId, 'Camera Plot Editor');

  // Core state management - but override with blueprint data
  const {
    scenes,
    activeScene,
    createScene,
    deleteScene,
    duplicateScene,
    setActiveScene,
    updateSceneName: originalUpdateSceneName,
    updatePlot: originalUpdatePlot,
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

  // Sync scenes with blueprint data when it's loaded
  useEffect(() => {
    if (blueprintManager.isInitialized && blueprintManager.data.cameraPlots.length > 0) {
      // Override local scenes with blueprint data
      scenes.splice(0, scenes.length, ...blueprintManager.data.cameraPlots);
    }
  }, [blueprintManager.isInitialized, blueprintManager.data.cameraPlots, scenes]);

  // Override updatePlot to save to blueprint
  const updatePlot = useCallback((sceneId: string, updatedScene: any) => {
    originalUpdatePlot(sceneId, updatedScene);
    // Also update in blueprint manager
    const updatedPlots = scenes.map(scene => 
      scene.id === sceneId ? updatedScene : scene
    );
    blueprintManager.updateCameraPlots(updatedPlots);
  }, [originalUpdatePlot, scenes, blueprintManager]);

  // Override updateSceneName to save to blueprint
  const updateSceneName = useCallback((sceneId: string, newName: string) => {
    originalUpdateSceneName(sceneId, newName);
    // Also update in blueprint manager
    const updatedPlots = scenes.map(scene => 
      scene.id === sceneId ? { ...scene, name: newName } : scene
    );
    blueprintManager.updateCameraPlots(updatedPlots);
  }, [originalUpdateSceneName, scenes, blueprintManager]);

  // Element interactions
  const {
    snapToGrid,
    baseAddElement,
    updateElement,
    deleteElement,
    duplicateElement
  } = useCameraPlotInteractions(activeScene, scenes, updateSceneName, updatePlot, setSelectedTool);

  // Enhanced operations
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

  // Safe wrapper for addElement
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
