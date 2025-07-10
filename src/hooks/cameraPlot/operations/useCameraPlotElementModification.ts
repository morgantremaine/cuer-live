
import { CameraElement, CameraPlotScene } from '@/hooks/useCameraPlot';


export const useCameraPlotElementModification = (
  activeScene: CameraPlotScene | undefined,
  updatePlot: (plotId: string, updatedPlot: Partial<CameraPlotScene>) => void
) => {
  const updateElement = (elementId: string, updates: Partial<CameraElement>) => {
    if (!activeScene) return;

    const updatedElements = activeScene.elements.map(element => {
      if (element.id === elementId) {
        return { ...element, ...updates };
      }
      return element;
    });

    updatePlot(activeScene.id, { elements: updatedElements });
  };

  const deleteElement = (elementId: string) => {
    if (!activeScene) return;

    const updatedElements = activeScene.elements.filter(el => el.id !== elementId);
    updatePlot(activeScene.id, { elements: updatedElements });
  };

  const duplicateElement = (elementId: string) => {
    if (!activeScene) return;

    const elementToDuplicate = activeScene.elements.find(el => el.id === elementId);
    if (!elementToDuplicate) return;

    const newElement: CameraElement = {
      ...elementToDuplicate,
      id: `element-${Date.now()}`,
      x: elementToDuplicate.x + 40,
      y: elementToDuplicate.y + 40
    };

    if (elementToDuplicate.type === 'camera') {
      newElement.label = 'CAM';
    }

    const updatedElements = [...activeScene.elements, newElement];
    updatePlot(activeScene.id, { elements: updatedElements });
  };

  return {
    updateElement,
    deleteElement,
    duplicateElement
  };
};
