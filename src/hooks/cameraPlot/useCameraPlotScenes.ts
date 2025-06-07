
import { useState, useEffect, useRef, useCallback } from 'react';
import { useCameraPlot, CameraPlotScene } from '@/hooks/useCameraPlot';

export const useCameraPlotScenes = (rundownId: string, readOnly = false) => {
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  
  const {
    plots: scenes,
    createNewPlot: createScene,
    deletePlot: deleteScene,
    duplicatePlot: duplicateScene,
    updatePlot,
    updateSceneName,
    reloadPlots
  } = useCameraPlot(rundownId, 'Camera Plot', readOnly);

  // Set active scene to first available scene and handle scene changes
  useEffect(() => {
    if (scenes.length > 0) {
      // If no active scene is set, set to first scene
      if (!activeSceneId) {
        const firstSceneId = scenes[0].id;
        setActiveSceneId(firstSceneId);
      } else {
        // Check if the current active scene still exists in the scenes
        const currentActiveScene = scenes.find(scene => scene.id === activeSceneId);
        if (!currentActiveScene) {
          // If current active scene doesn't exist, set to first scene
          const firstSceneId = scenes[0].id;
          setActiveSceneId(firstSceneId);
        }
      }
    } else if (scenes.length === 0) {
      // Clear active scene if no scenes exist
      if (activeSceneId !== null) {
        setActiveSceneId(null);
      }
    }
  }, [scenes, activeSceneId]);

  // Always get the most current active scene from the scenes array
  const activeScene = activeSceneId ? scenes.find(scene => scene.id === activeSceneId) || null : null;

  const setActiveScene = useCallback((sceneId: string) => {
    setActiveSceneId(sceneId);
  }, []);

  return {
    scenes,
    activeScene,
    activeSceneId,
    setActiveScene,
    createScene,
    deleteScene,
    duplicateScene,
    updateScene: updatePlot, // Alias for backwards compatibility
    updatePlot,
    updateSceneName,
    reloadPlots
  };
};
