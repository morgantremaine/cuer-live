
import { CameraElement, CameraPlotScene } from '@/hooks/useCameraPlot';
import { snapToGrid } from '../utils/gridUtils';
import { getNextCameraNumber } from '../utils/cameraUtils';

export const useCameraPlotElementCreation = (
  activeScene: CameraPlotScene | undefined,
  updatePlot: (plotId: string, updatedPlot: Partial<CameraPlotScene>) => void
) => {
  const addElement = (type: string, x: number, y: number, wallData?: { start: { x: number; y: number }, end: { x: number; y: number } }) => {
    if (!activeScene) return;

    let newElement: CameraElement;
    const elementId = `element-${Date.now()}-${Math.random()}`;

    if (type === 'wall' && wallData) {
      // Create wall from start to end points
      const { start, end } = wallData;
      const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
      
      newElement = {
        id: elementId,
        type: 'wall',
        x: start.x,
        y: start.y - 2,
        width: distance,
        height: 4,
        rotation: angle,
        scale: 1,
        label: '',
        labelOffsetX: 0,
        labelOffsetY: -20
      };
    } else {
      const snapped = snapToGrid(x, y);
      
      switch (type) {
        case 'camera':
          const cameraNumber = getNextCameraNumber(activeScene.elements);
          newElement = {
            id: elementId,
            type: 'camera',
            x: snapped.x - 25,
            y: snapped.y - 25,
            width: 50,
            height: 50,
            rotation: 0,
            scale: 1,
            label: `CAM ${cameraNumber}`,
            cameraNumber,
            labelOffsetX: 0,
            labelOffsetY: 60
          };
          break;
        case 'person':
          newElement = {
            id: elementId,
            type: 'person',
            x: snapped.x - 20,
            y: snapped.y - 20,
            width: 40,
            height: 40,
            rotation: 0,
            scale: 1,
            label: 'Person',
            labelOffsetX: 0,
            labelOffsetY: 50
          };
          break;
        case 'furniture-rect':
          newElement = {
            id: elementId,
            type: 'furniture',
            x: snapped.x - 40,
            y: snapped.y - 30,
            width: 80,
            height: 60,
            rotation: 0,
            scale: 1,
            label: 'Table',
            labelOffsetX: 0,
            labelOffsetY: 70
          };
          break;
        case 'furniture-circle':
          newElement = {
            id: elementId,
            type: 'furniture',
            x: snapped.x - 30,
            y: snapped.y - 30,
            width: 60,
            height: 60,
            rotation: 0,
            scale: 1,
            label: 'Round Table',
            labelOffsetX: 0,
            labelOffsetY: 70
          };
          break;
        default:
          return;
      }
    }

    const updatedElements = [...activeScene.elements, newElement];
    updatePlot(activeScene.id, { elements: updatedElements });
  };

  return {
    addElement
  };
};
