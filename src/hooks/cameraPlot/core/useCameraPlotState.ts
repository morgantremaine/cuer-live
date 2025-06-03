
import { useCameraPlotScenes } from '../useCameraPlotScenes';
import { useCameraPlotTools } from '../useCameraPlotTools';
import { useCameraPlotWalls } from '../useCameraPlotWalls';

export const useCameraPlotState = (rundownId: string) => {
  const sceneState = useCameraPlotScenes(rundownId, false); // Editor mode (not read-only)
  const toolState = useCameraPlotTools();
  const wallState = useCameraPlotWalls();

  console.log('useCameraPlotState - activeScene:', sceneState.activeScene?.id, 'scenes:', sceneState.scenes.length);

  return {
    ...sceneState,
    ...toolState,
    ...wallState
  };
};
