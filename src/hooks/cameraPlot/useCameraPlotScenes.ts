
import { useState, useEffect, useRef, useCallback } from 'react';
import { useCameraPlot, CameraPlotScene } from '@/hooks/useCameraPlot';

export const useCameraPlotScenes = (rundownId: string, readOnly = false) => {
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const lastLogTimeRef = useRef<number>(0);
  const LOG_THROTTLE_MS = 30000; // Increased to 30 seconds to reduce noise
  
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
    const now = Date.now();
    const shouldLog = now - lastLogTimeRef.current > LOG_THROTTLE_MS;
    
    if (scenes.length > 0) {
      // If no active scene is set, set to first scene
      if (!activeSceneId) {
        const firstSceneId = scenes[0].id;
        if (shouldLog) {
          console.log('Setting active scene to first plot:', firstSceneId);
          lastLogTimeRef.current = now;
        }
        setActiveSceneId(firstSceneId);
      } else {
        // Check if the current active scene still exists in the scenes
        const currentActiveScene = scenes.find(scene => scene.id === activeSceneId);
        if (!currentActiveScene) {
          // If current active scene doesn't exist, set to first scene
          const firstSceneId = scenes[0].id;
          if (shouldLog) {
            console.log('Active scene not found, setting to first plot:', firstSceneId);
            lastLogTimeRef.current = now;
          }
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

  // Remove the noisy log that was running on every render
  // console.log('useCameraPlotScenes - activeSceneId:', activeSceneId, 'activeScene found:', !!activeScene, 'scenes count:', scenes.length);

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
