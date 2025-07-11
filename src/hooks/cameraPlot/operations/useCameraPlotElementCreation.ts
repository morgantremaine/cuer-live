
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CameraElement, CameraPlotScene } from '@/hooks/useCameraPlot';


export const useCameraPlotElementCreation = (
  activeScene: CameraPlotScene | undefined,
  updatePlot: (plotId: string, updatedPlot: Partial<CameraPlotScene>) => void,
  setSelectedTool: (tool: string) => void
) => {
  const addElement = useCallback((type: string, x: number, y: number) => {
    if (!activeScene) {
      return;
    }

    // Convert tool types to element types
    const getElementType = (toolType: string): "camera" | "person" | "wall" | "furniture" => {
      if (toolType === 'furniture-rect' || toolType === 'furniture-circle') {
        return 'furniture';
      }
      return toolType as "camera" | "person" | "wall" | "furniture";
    };

    const elementType = getElementType(type);

    // Special handling for wall tool - create wall elements directly
    if (type === 'wall') {
      const wallElement: CameraElement = {
        id: uuidv4(),
        type: 'wall',
        x: x - 50, // Start 50px left of click
        y: y,
        width: 100, // 100px wide wall segment
        height: 4,  // 4px thick
        rotation: 0,
        scale: 1,
        label: 'Wall'
      };

      console.log('Creating wall element:', wallElement);
      const updatedElements = [...activeScene.elements, wallElement];
      updatePlot(activeScene.id, { elements: updatedElements });
      setSelectedTool('select');
      return;
    }

    const baseElement: Omit<CameraElement, 'id'> = {
      type: elementType,
      x,
      y,
      width: 40,
      height: 40,
      rotation: 0,
      scale: 1,
      label: ''
    };

    let newElement: CameraElement;

    switch (type) {
      case 'camera':
        newElement = {
          ...baseElement,
          id: uuidv4(),
          label: 'CAM',
          width: 40,
          height: 32
        };
        break;
      case 'person':
        newElement = {
          ...baseElement,
          id: uuidv4(),
          label: 'Person',
          width: 40,
          height: 40
        };
        break;
      case 'furniture-rect':
        newElement = {
          ...baseElement,
          id: uuidv4(),
          type: 'furniture',
          label: 'Square',
          width: 60,
          height: 60
        };
        break;
      case 'furniture-circle':
        newElement = {
          ...baseElement,
          id: uuidv4(),
          type: 'furniture',
          label: 'Circle',
          width: 60,
          height: 60
        };
        break;
      default:
        console.log('Unknown element type:', type);
        return;
    }

    console.log('Creating element:', newElement);

    const updatedElements = [...activeScene.elements, newElement];
    updatePlot(activeScene.id, { elements: updatedElements });

    // Auto-switch to select tool after creating an element
    setSelectedTool('select');
  }, [activeScene, updatePlot, setSelectedTool]);

  return { addElement };
};
