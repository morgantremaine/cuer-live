
import { useCameraPlotScenes } from '../useCameraPlotScenes';
import { useCameraPlotTools } from '../useCameraPlotTools';
import { useCameraPlotWalls } from '../useCameraPlotWalls';

export const useCameraPlotState = (rundownId: string) => {
  const sceneState = useCameraPlotScenes(rundownId);
  const toolState = useCameraPlotTools();
  const wallState = useCameraPlotWalls();

  return {
    ...sceneState,
    ...toolState,
    ...wallState
  };
};
