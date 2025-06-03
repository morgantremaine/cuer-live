
import { useState, useEffect, useCallback } from 'react';
import { useCameraPlot, CameraElement, CameraPlotScene } from '@/hooks/useCameraPlot';

export const useCameraPlotEditor = (rundownId: string) => {
  const { plots, createNewPlot, deletePlot, duplicatePlot, updatePlot } = useCameraPlot(rundownId, 'Camera Plot');
  
  const [activeSceneId, setActiveSceneId] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [isDrawingWall, setIsDrawingWall] = useState(false);
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null);
  const [showGrid, setShowGrid] = useState(true);

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
    setWallStart(null);
  };

  const updateSceneName = (sceneId: string, newName: string) => {
    const scene = plots.find(s => s.id === sceneId);
    if (scene) {
      updatePlot(sceneId, { name: newName });
    }
  };

  // Snap to grid function
  const snapToGrid = (x: number, y: number, gridSize = 20) => {
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
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

  const addElement = (type: string, x: number, y: number) => {
    if (!activeScene) return;

    const snapped = snapToGrid(x, y);

    if (type === 'wall') {
      if (!isDrawingWall) {
        // Start drawing wall
        setIsDrawingWall(true);
        setWallStart(snapped);
        return;
      } else if (wallStart) {
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
        
        // Continue drawing from the end point
        setWallStart(snapped);
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
    setSelectedElements(prev => prev.filter(id => id !== elementId));
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
      setSelectedElements(elementId ? [elementId] : []);
    }
  };

  const stopDrawingWalls = () => {
    setIsDrawingWall(false);
    setWallStart(null);
    setSelectedTool('select');
  };

  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };

  return {
    scenes: plots,
    activeScene,
    selectedTool,
    selectedElements,
    isDrawingWall,
    wallStart,
    showGrid,
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
    stopDrawingWalls,
    toggleGrid,
    snapToGrid
  };
};
