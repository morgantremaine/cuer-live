
import { CameraElement, CameraPlotScene } from '@/hooks/useCameraPlot';
import { snapToGrid } from '../utils/gridUtils';
import { getNextCameraNumber } from '../utils/cameraUtils';

export const useCameraPlotElementCreation = (
  activeScene: CameraPlotScene | undefined,
  updatePlot: (plotId: string, updatedPlot: Partial<CameraPlotScene>) => void,
  setSelectedTool: (tool: string) => void
) => {
  const addElement = (type: string, x: number, y: number, wallData?: { start: { x: number; y: number }, end: { x: number; y: number } }) => {
    console.log('addElement called with:', { type, x, y, wallData, activeSceneId: activeScene?.id });
    
    if (!activeScene) {
      console.log('No active scene, cannot add element');
      return;
    }

    console.log('Adding element:', { type, x, y, wallData });

    let newElement: CameraElement;
    const elementId = `element-${Date.now()}-${Math.random()}`;

    // Check if there's temporary wall data from the canvas handlers
    const tempWallData = (window as any).__tempWallData;
    
    if (type === 'wall' && (wallData || tempWallData)) {
      // Create wall from start to end points
      const wallInfo = wallData || tempWallData;
      const { start, end, id } = wallInfo;
      const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
      
      console.log('Creating wall with distance:', distance, 'angle:', angle);
      
      newElement = {
        id: id || elementId,
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
    } else if (type === 'wall') {
      // Create a default wall segment when no wallData is provided
      const snapped = snapToGrid(x, y);
      
      newElement = {
        id: elementId,
        type: 'wall',
        x: snapped.x,
        y: snapped.y - 2,
        width: 100,
        height: 4,
        rotation: 0,
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
            labelOffsetY: 55 // Position label directly under the camera
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
            labelOffsetY: 45 // Position label directly under the person
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
            label: 'Rectangle', // Changed from 'Table'
            labelOffsetX: 0,
            labelOffsetY: 65 // Position label directly under the furniture
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
            label: 'Circle', // Changed from 'Round Table'
            labelOffsetX: 0,
            labelOffsetY: 65 // Position label directly under the furniture
          };
          break;
        default:
          console.log('Unknown element type:', type);
          return;
      }
    }

    console.log('Created element:', newElement);
    const updatedElements = [...activeScene.elements, newElement];
    console.log('Updating scene with new elements count:', updatedElements.length);
    updatePlot(activeScene.id, { elements: updatedElements });
    
    // Switch back to select tool after placing any element (except walls, which are handled in wall handlers)
    if (type !== 'wall') {
      setSelectedTool('select');
    }
  };

  return {
    addElement
  };
};
