
import { useCameraPlotScenes } from './cameraPlot/useCameraPlotScenes';
import { useCameraPlotTools } from './cameraPlot/useCameraPlotTools';
import { useCameraPlotInteractions } from './cameraPlot/interactions/useCameraPlotInteractions';

export const useCameraPlotEditor = (rundownId: string) => {
  // Scene management
  const sceneState = useCameraPlotScenes(rundownId, false);
  
  // Tool state
  const toolState = useCameraPlotTools();
  
  // Element interactions - only initialize if we have an active scene
  const {
    snapToGrid,
    baseAddElement,
    updateElement,
    deleteElement,
    duplicateElement
  } = useCameraPlotInteractions(
    sceneState.activeScene, 
    sceneState.scenes, 
    sceneState.updateSceneName, 
    sceneState.updatePlot, 
    toolState.setSelectedTool
  );

  // Safe wrapper for addElement that checks for active scene
  const safeAddElement = (type: string, x: number, y: number) => {
    if (!sceneState.activeScene) {
      console.log('No active scene available for element creation');
      return;
    }
    baseAddElement(type, x, y);
  };

  return {
    // Scene state
    ...sceneState,
    // Tool state  
    ...toolState,
    // Element operations
    addElement: safeAddElement,
    updateElement,
    deleteElement,
    duplicateElement,
    snapToGrid
  };
};
