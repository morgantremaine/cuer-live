
import { useState, useEffect, useCallback } from 'react';
import { useCameraPlot, CameraElement, CameraPlotScene } from '@/hooks/useCameraPlot';

export const useCameraPlotEditor = (rundownId: string) => {
  const { plots, createNewPlot, deletePlot, duplicatePlot, updatePlot } = useCameraPlot(rundownId, 'Camera Plot');
  
  const [activeSceneId, setActiveSceneId] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [isDrawingWall, setIsDrawingWall] = useState(false);
  const [wallPoints, setWallPoints] = useState<{ x: number; y: number }[]>([]);

  // Initialize with first scene or create one if none exist
  useEffect(() => {
    if (plots.length === 0) {
      createNewPlot('Scene 1');
    } else if (!activeSceneId && plots.length > 0) {
      setActiveSceneId(plots[0].id);
    }
  }, [plots, activeSceneId, createNewPlot]);

  const activeScene = plots.find(scene => scene.id === activeSceneId);

  const createScene = (name: string) => {
    createNewPlot(name);
  };

  const deleteScene = (sceneId: string) => {
    if (plots.length > 1) {
      deletePlot(sceneId);
      if (activeSceneId === sceneId) {
        const remainingScenes = plots.filter(s => s.id !== sceneId);
        if (remainingScenes.length > 0) {
          setActiveSceneId(remainingScenes[0].id);
        }
      }
    }
  };

  const duplicateScene = (sceneId: string) => {
    duplicatePlot(sceneId);
  };

  const setActiveScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    setSelectedElements([]);
    setIsDrawingWall(false);
    setWallPoints([]);
  };

  const updateSceneName = (sceneId: string, newName: string) => {
    const scene = plots.find(s => s.id === sceneId);
    if (scene) {
      updatePlot(sceneId, { name: newName });
    }
  };

  const getNextCameraNumber = useCallback((elements: CameraElement[]) => {
    const cameraNumbers = elements
      .filter(el => el.type === 'camera')
      .map(el => el.cameraNumber || 0)
      .sort((a, b) => a - b);
    
    for (let i = 1; i <= cameraNumbers.length + 1; i++) {
      if (!cameraNumbers.includes(i)) {
        return i;
      }
    }
    return 1;
  }, []);

  const reorderCameraNumbers = useCallback((elements: CameraElement[]) => {
    const cameras = elements.filter(el => el.type === 'camera');
    const nonCameras = elements.filter(el => el.type !== 'camera');
    
    cameras.sort((a, b) => (a.cameraNumber || 0) - (b.cameraNumber || 0));
    cameras.forEach((camera, index) => {
      camera.cameraNumber = index + 1;
      camera.label = `CAM ${index + 1}`;
    });
    
    return [...cameras, ...nonCameras];
  }, []);

  const addElement = (type: string, x: number, y: number) => {
    if (!activeScene) return;

    if (type === 'wall') {
      if (!isDrawingWall) {
        // Start drawing wall
        setIsDrawingWall(true);
        setWallPoints([{ x, y }]);
        return;
      } else {
        // Add point to wall
        const newPoints = [...wallPoints, { x, y }];
        setWallPoints(newPoints);
        
        // Create wall segment from previous point to current point
        if (wallPoints.length > 0) {
          const prevPoint = wallPoints[wallPoints.length - 1];
          const distance = Math.sqrt(Math.pow(x - prevPoint.x, 2) + Math.pow(y - prevPoint.y, 2));
          const angle = Math.atan2(y - prevPoint.y, x - prevPoint.x) * (180 / Math.PI);
          
          const newElement: CameraElement = {
            id: `wall-${Date.now()}-${Math.random()}`,
            type: 'wall',
            x: prevPoint.x,
            y: prevPoint.y - 2, // Center the wall line
            width: distance,
            height: 4,
            rotation: angle,
            scale: 1,
            label: 'Wall',
            labelOffsetX: 0,
            labelOffsetY: 20
          };

          const updatedElements = [...activeScene.elements, newElement];
          updatePlot(activeScene.id, { elements: updatedElements });
        }
        return;
      }
    }

    let newElement: CameraElement;
    const elementId = `element-${Date.now()}`;

    switch (type) {
      case 'camera':
        const cameraNumber = getNextCameraNumber(activeScene.elements);
        newElement = {
          id: elementId,
          type: 'camera',
          x: x - 20,
          y: y - 20,
          width: 40,
          height: 40,
          rotation: 0,
          scale: 1,
          label: `CAM ${cameraNumber}`,
          cameraNumber,
          labelOffsetX: 0,
          labelOffsetY: 50
        };
        break;
      case 'person':
        newElement = {
          id: elementId,
          type: 'person',
          x: x - 15,
          y: y - 15,
          width: 30,
          height: 30,
          rotation: 0,
          scale: 1,
          label: 'Person',
          labelOffsetX: 0,
          labelOffsetY: 40
        };
        break;
      case 'furniture-rect':
        newElement = {
          id: elementId,
          type: 'furniture',
          x: x - 25,
          y: y - 25,
          width: 50,
          height: 50,
          rotation: 0,
          scale: 1,
          label: 'Furniture',
          labelOffsetX: 0,
          labelOffsetY: 60
        };
        break;
      case 'furniture-circle':
        newElement = {
          id: elementId,
          type: 'furniture',
          x: x - 25,
          y: y - 25,
          width: 50,
          height: 50,
          rotation: 0,
          scale: 1,
          label: 'Round Table',
          labelOffsetX: 0,
          labelOffsetY: 60
        };
        break;
      default:
        return;
    }

    const updatedElements = [...activeScene.elements, newElement];
    updatePlot(activeScene.id, { elements: updatedElements });
  };

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

    let updatedElements = activeScene.elements.filter(el => el.id !== elementId);
    
    // Reorder camera numbers if a camera was deleted
    const deletedElement = activeScene.elements.find(el => el.id === elementId);
    if (deletedElement?.type === 'camera') {
      updatedElements = reorderCameraNumbers(updatedElements);
    }

    updatePlot(activeScene.id, { elements: updatedElements });
    setSelectedElements(prev => prev.filter(id => id !== elementId));
  };

  const duplicateElement = (elementId: string) => {
    if (!activeScene) return;

    const elementToDuplicate = activeScene.elements.find(el => el.id === elementId);
    if (!elementToDuplicate) return;

    const newElement: CameraElement = {
      ...elementToDuplicate,
      id: `element-${Date.now()}`,
      x: elementToDuplicate.x + 20,
      y: elementToDuplicate.y + 20
    };

    if (elementToDuplicate.type === 'camera') {
      const cameraNumber = getNextCameraNumber(activeScene.elements);
      newElement.cameraNumber = cameraNumber;
      newElement.label = `CAM ${cameraNumber}`;
    }

    const updatedElements = [...activeScene.elements, newElement];
    updatePlot(activeScene.id, { elements: updatedElements });
  };

  const selectElement = (elementId: string, multiSelect = false) => {
    if (multiSelect) {
      setSelectedElements(prev => 
        prev.includes(elementId) 
          ? prev.filter(id => id !== elementId)
          : [...prev, elementId]
      );
    } else {
      setSelectedElements([elementId]);
    }
  };

  const stopDrawingWalls = () => {
    setIsDrawingWall(false);
    setWallPoints([]);
    setSelectedTool('select');
  };

  return {
    scenes: plots,
    activeScene,
    selectedTool,
    selectedElements,
    isDrawingWall,
    wallPoints,
    setSelectedTool,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    selectElement,
    createScene,
    deleteScene,
    duplicateScene,
    setActiveScene,
    updateSceneName,
    stopDrawingWalls
  };
};
