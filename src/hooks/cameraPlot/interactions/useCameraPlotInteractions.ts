
import { useCameraPlotElements } from '../useCameraPlotElements';
import { CameraPlotScene } from '@/hooks/useCameraPlot';

export const useCameraPlotInteractions = (
  activeScene: CameraPlotScene | undefined,
  scenes: CameraPlotScene[],
  updateSceneName: (sceneId: string, name: string) => void
) => {
  const updatePlotCallback = (plotId: string, updates: Partial<CameraPlotScene>) => {
    const sceneToUpdate = scenes.find(s => s.id === plotId);
    if (sceneToUpdate) {
      updateSceneName(plotId, updates.name || sceneToUpdate.name);
      if (updates.elements) {
        const plot = scenes.find(s => s.id === plotId);
        if (plot && 'updatePlot' in plot) {
          (plot as any).updatePlot(plotId, updates);
        }
      }
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
