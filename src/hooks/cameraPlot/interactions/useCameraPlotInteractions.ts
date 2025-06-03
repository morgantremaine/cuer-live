
import { useCameraPlotElements } from '../useCameraPlotElements';
import { CameraPlotScene } from '@/hooks/useCameraPlot';

export const useCameraPlotInteractions = (
  activeScene: CameraPlotScene | undefined,
  scenes: CameraPlotScene[],
  updateSceneName: (sceneId: string, name: string) => void,
  updatePlot: (plotId: string, updates: Partial<CameraPlotScene>) => void,
  setSelectedTool: (tool: string) => void
) => {
  // Remove the noisy log that was running constantly
  // console.log('useCameraPlotInteractions - activeScene:', activeScene?.id, 'scenes count:', scenes.length);
  
  const updatePlotCallback = (plotId: string, updates: Partial<CameraPlotScene>) => {
    // Only log when actually important updates happen
    if (updates.elements && updates.elements.length !== activeScene?.elements?.length) {
      console.log('updatePlotCallback called with plotId:', plotId, 'element count changed to:', updates.elements.length);
    }
    updatePlot(plotId, updates);
    
    // Also handle name updates separately if needed
    if (updates.name) {
      updateSceneName(plotId, updates.name);
    }
  };

  const {
    snapToGrid,
    addElement: baseAddElement,
    updateElement,
    deleteElement,
    duplicateElement
  } = useCameraPlotElements(activeScene, updatePlotCallback, setSelectedTool);

  return {
    snapToGrid,
    baseAddElement,
    updateElement,
    deleteElement,
    duplicateElement
  };
};
