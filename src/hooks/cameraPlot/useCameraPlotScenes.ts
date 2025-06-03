
import { useState, useEffect, useRef, useCallback } from 'react';
import { useCameraPlot, CameraPlotScene } from '@/hooks/useCameraPlot';

export const useCameraPlotScenes = (rundownId: string, readOnly = false) => {
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const lastLogTimeRef = useRef<number>(0);
  const LOG_THROTTLE_MS = 5000; // Reduced logging frequency
  
  const {
    plots: scenes,
    createNewPlot: createScene,
    deletePlot: deleteScene,
    duplicatePlot: duplicateScene,
    updatePlot,
    updateSceneName,
    reloadPlots
  } = useCameraPlot(rundownId, 'Camera Plot', readOnly);

  // Set active scene to first available scene
  useEffect(() => {
    const now = Date.now();
    const shouldLog = now - lastLogTimeRef.current > LOG_THROTTLE_MS;
    
    if (scenes.length > 0 && !activeSceneId) {
      if (shouldLog) {
        console.log('Setting active scene to first plot:', scenes[0].id);
        lastLogTimeRef.current = now;
      }
      setActiveSceneId(scenes[0].id);
    } else if (scenes.length === 0 && activeSceneId) {
      setActiveSceneId(null);
    }
  }, [scenes, activeSceneId]);

  const activeScene = scenes.find(scene => scene.id === activeSceneId) || null;

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
    updatePlot, // Make sure this is returned
    updateSceneName, // Make sure this is returned
    reloadPlots
  };
};
