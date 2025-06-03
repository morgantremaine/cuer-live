
import { useState, useEffect } from 'react';
import { useCameraPlot, CameraPlotScene } from '@/hooks/useCameraPlot';

export const useCameraPlotScenes = (rundownId: string) => {
  const { plots, createNewPlot, deletePlot, duplicatePlot, updatePlot, reloadPlots } = useCameraPlot(rundownId, 'Camera Plot');
  const [activeSceneId, setActiveSceneId] = useState<string>('');

  // Wait for plots to load and set active scene
  useEffect(() => {
    if (plots.length > 0) {
      // If we don't have an active scene or it doesn't exist anymore, set to first
      const activeExists = plots.find(p => p.id === activeSceneId);
      if (!activeSceneId || !activeExists) {
        console.log('Setting active scene to first plot:', plots[0].id);
        setActiveSceneId(plots[0].id);
      }
    } else if (plots.length === 0 && activeSceneId) {
      // Clear active scene if no plots exist
      setActiveSceneId('');
    }
  }, [plots, activeSceneId]);

  const activeScene = plots.find(scene => scene.id === activeSceneId);

  console.log('Current active scene:', activeScene?.id, 'from plots:', plots.length);

  const createScene = (name: string) => {
    const newPlot = createNewPlot(name);
    if (newPlot) {
      setActiveSceneId(newPlot.id);
    }
    return newPlot;
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
    const newPlot = duplicatePlot(sceneId);
    if (newPlot) {
      setActiveSceneId(newPlot.id);
    }
    return newPlot;
  };

  const setActiveScene = (sceneId: string) => {
    console.log('Setting active scene to:', sceneId);
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
    updatePlot,
    reloadPlots
  };
};
