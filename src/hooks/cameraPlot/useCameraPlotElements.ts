
import { CameraPlotScene } from '@/hooks/useCameraPlot';
import { snapToGrid } from './utils/gridUtils';
import { useCameraPlotElementCreation } from './operations/useCameraPlotElementCreation';
import { useCameraPlotElementModification } from './operations/useCameraPlotElementModification';

export const useCameraPlotElements = (
  activeScene: CameraPlotScene | undefined,
  updatePlot: (plotId: string, updatedPlot: Partial<CameraPlotScene>) => void,
  setSelectedTool: (tool: string) => void
) => {
  const { addElement } = useCameraPlotElementCreation(activeScene, updatePlot, setSelectedTool);
  const { updateElement, deleteElement, duplicateElement } = useCameraPlotElementModification(activeScene, updatePlot);

  return {
    snapToGrid,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement
  };
};
