
import { useState, useEffect } from 'react';
import { useCameraPlot, CameraPlotScene } from '@/hooks/useCameraPlot';

export const useCameraPlotScenes = (rundownId: string) => {
  const { plots, createNewPlot, deletePlot, duplicatePlot, updatePlot } = useCameraPlot(rundownId, 'Camera Plot');
  const [activeSceneId, setActiveSceneId] = useState<string>('');

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
  };

  const updateSceneName = (sceneId: string, newName: string) => {
    const scene = plots.find(s => s.id === sceneId);
    if (scene) {
      updatePlot(sceneId, { name: newName });
    }
  };

  return {
    scenes: plots,
    activeScene,
    createScene,
    deleteScene,
    duplicateScene,
    setActiveScene,
    updateSceneName,
    updatePlot
  };
};
