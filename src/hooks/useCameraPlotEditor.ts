
import { useState, useEffect } from 'react';
import { CameraElement, CameraPlotScene } from './useCameraPlot';
import { useBlueprintStorage } from './useBlueprintStorage';

export const useCameraPlotEditor = (rundownId: string) => {
  const [scenes, setScenes] = useState<CameraPlotScene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { savedBlueprint, saveBlueprint } = useBlueprintStorage(rundownId);

  const activeScene = scenes.find(scene => scene.id === activeSceneId);

  // Load saved data
  useEffect(() => {
    if (savedBlueprint && !isInitialized) {
      if (savedBlueprint.camera_plots && Array.isArray(savedBlueprint.camera_plots)) {
        setScenes(savedBlueprint.camera_plots);
        if (savedBlueprint.camera_plots.length > 0) {
          setActiveSceneId(savedBlueprint.camera_plots[0].id);
        }
      } else {
        // Create initial scene if none exist
        const initialScene: CameraPlotScene = {
          id: `scene-${Date.now()}`,
          name: 'Scene 1',
          elements: []
        };
        setScenes([initialScene]);
        setActiveSceneId(initialScene.id);
      }
      setIsInitialized(true);
    }
  }, [savedBlueprint, isInitialized]);

  // Auto-save
  useEffect(() => {
    if (isInitialized && rundownId) {
      const saveTimeout = setTimeout(() => {
        saveBlueprint(
          savedBlueprint?.rundown_title || 'Unknown Rundown',
          savedBlueprint?.lists || [],
          savedBlueprint?.show_date,
          true,
          savedBlueprint?.notes,
          savedBlueprint?.crew_data,
          scenes
        );
      }, 1000);

      return () => clearTimeout(saveTimeout);
    }
  }, [scenes, isInitialized, rundownId, savedBlueprint, saveBlueprint]);

  const addElement = (element: Omit<CameraElement, 'id'>) => {
    if (!activeScene) return;

    let newElement: CameraElement = {
      ...element,
      id: `element-${Date.now()}`
    };

    // Auto-assign camera numbers
    if (element.type === 'camera') {
      const existingCameras = activeScene.elements.filter(el => el.type === 'camera');
      const usedNumbers = existingCameras.map(cam => cam.cameraNumber).filter(Boolean).sort((a, b) => a! - b!);
      
      let nextNumber = 1;
      for (const num of usedNumbers) {
        if (num === nextNumber) {
          nextNumber++;
        } else {
          break;
        }
      }
      
      newElement.cameraNumber = nextNumber;
      newElement.label = `Cam ${nextNumber}`;
    }

    const updatedScene = {
      ...activeScene,
      elements: [...activeScene.elements, newElement]
    };

    setScenes(scenes.map(scene => 
      scene.id === activeSceneId ? updatedScene : scene
    ));
  };

  const updateElement = (elementId: string, updates: Partial<CameraElement>) => {
    if (!activeScene) return;

    const updatedScene = {
      ...activeScene,
      elements: activeScene.elements.map(element =>
        element.id === elementId ? { ...element, ...updates } : element
      )
    };

    setScenes(scenes.map(scene => 
      scene.id === activeSceneId ? updatedScene : scene
    ));
  };

  const deleteElement = (elementId: string) => {
    if (!activeScene) return;

    const elementToDelete = activeScene.elements.find(el => el.id === elementId);
    let updatedElements = activeScene.elements.filter(element => element.id !== elementId);

    // Renumber cameras if a camera was deleted
    if (elementToDelete?.type === 'camera') {
      const cameras = updatedElements.filter(el => el.type === 'camera');
      cameras.sort((a, b) => (a.cameraNumber || 0) - (b.cameraNumber || 0));
      
      cameras.forEach((camera, index) => {
        const newNumber = index + 1;
        camera.cameraNumber = newNumber;
        camera.label = `Cam ${newNumber}`;
      });
    }

    const updatedScene = {
      ...activeScene,
      elements: updatedElements
    };

    setScenes(scenes.map(scene => 
      scene.id === activeSceneId ? updatedScene : scene
    ));
  };

  const selectElement = (elementId: string) => {
    setSelectedElements([elementId]);
  };

  const createScene = (name: string) => {
    const newScene: CameraPlotScene = {
      id: `scene-${Date.now()}`,
      name,
      elements: []
    };
    setScenes([...scenes, newScene]);
    setActiveSceneId(newScene.id);
  };

  const deleteScene = (sceneId: string) => {
    const newScenes = scenes.filter(scene => scene.id !== sceneId);
    setScenes(newScenes);
    
    if (activeSceneId === sceneId && newScenes.length > 0) {
      setActiveSceneId(newScenes[0].id);
    }
  };

  const duplicateScene = (sceneId: string) => {
    const sceneToDuplicate = scenes.find(scene => scene.id === sceneId);
    if (sceneToDuplicate) {
      const duplicatedScene: CameraPlotScene = {
        ...sceneToDuplicate,
        id: `scene-${Date.now()}`,
        name: `${sceneToDuplicate.name} (Copy)`,
        elements: sceneToDuplicate.elements.map(element => ({
          ...element,
          id: `element-${Date.now()}-${Math.random()}`
        }))
      };
      setScenes([...scenes, duplicatedScene]);
    }
  };

  const setActiveScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
  };

  const updateSceneName = (sceneId: string, newName: string) => {
    setScenes(scenes.map(scene => 
      scene.id === sceneId ? { ...scene, name: newName } : scene
    ));
  };

  return {
    scenes,
    activeScene,
    selectedTool,
    selectedElements,
    setSelectedTool,
    addElement,
    updateElement,
    deleteElement,
    selectElement,
    createScene,
    deleteScene,
    duplicateScene,
    setActiveScene,
    updateSceneName
  };
};
