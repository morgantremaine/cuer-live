
import { useCameraPlotElements } from '../useCameraPlotElements';
import { CameraPlotScene } from '@/hooks/useCameraPlot';

export const useCameraPlotInteractions = (
  activeScene: CameraPlotScene | undefined,
  scenes: CameraPlotScene[],
  updateSceneName: (sceneId: string, name: string) => void,
  updatePlot: (plotId: string, updates: Partial<CameraPlotScene>) => void
) => {
  const updatePlotCallback = (plotId: string, updates: Partial<CameraPlotScene>) => {
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
  } = useCameraPlotElements(activeScene, updatePlotCallback);

  return {
    snapToGrid,
    baseAddElement,
    updateElement,
    deleteElement,
    duplicateElement
  };
};
