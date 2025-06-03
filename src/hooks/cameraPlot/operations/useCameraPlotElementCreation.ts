
import { CameraElement, CameraPlotScene } from '@/hooks/useCameraPlot';
import { snapToGrid } from '../utils/gridUtils';
import { getNextCameraNumber } from '../utils/cameraUtils';

export const useCameraPlotElementCreation = (
  activeScene: CameraPlotScene | undefined,
  updatePlot: (plotId: string, updatedPlot: Partial<CameraPlotScene>) => void
) => {
  const addElement = (type: string, x: number, y: number, wallStart?: { x: number; y: number } | null, onWallComplete?: () => void) => {
    if (!activeScene) return;

    const snapped = snapToGrid(x, y);

    if (type === 'wall' && wallStart) {
      // Complete the wall
      const elementId = `wall-${Date.now()}`;
      const distance = Math.sqrt(Math.pow(snapped.x - wallStart.x, 2) + Math.pow(snapped.y - wallStart.y, 2));
      const angle = Math.atan2(snapped.y - wallStart.y, snapped.x - wallStart.x) * (180 / Math.PI);
      
      const newElement: CameraElement = {
        id: elementId,
        type: 'wall',
        x: wallStart.x,
        y: wallStart.y - 2,
        width: distance,
        height: 4,
        rotation: angle,
        scale: 1,
        label: '',
        labelOffsetX: 0,
        labelOffsetY: -20
      };

      const updatedElements = [...activeScene.elements, newElement];
      updatePlot(activeScene.id, { elements: updatedElements });
      
      if (onWallComplete) {
        onWallComplete();
      }
      return;
    }

    let newElement: CameraElement;
    const elementId = `element-${Date.now()}`;

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

    const updatedElements = [...activeScene.elements, newElement];
    updatePlot(activeScene.id, { elements: updatedElements });
  };

  return {
    addElement
  };
};
