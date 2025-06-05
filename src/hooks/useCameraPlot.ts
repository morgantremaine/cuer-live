
import { useCameraPlotData } from './cameraPlot/core/useCameraPlotData';
import { useCameraPlotAutoSave } from './cameraPlot/core/useCameraPlotAutoSave';
import { useCameraPlotSceneOperations } from './cameraPlot/operations/useCameraPlotSceneOperations';

// Re-export types for backwards compatibility
export type { CameraElement, CameraPlotScene, CameraPlotData } from './cameraPlot/core/useCameraPlotData';

export const useCameraPlot = (
  rundownId: string, 
  rundownTitle: string, 
  readOnly = false,
  saveBlueprint?: (lists?: any[], silent?: boolean, notes?: string, crewData?: any[], cameraPlots?: any[]) => void
) => {
  const {
    plots,
    setPlots,
    isInitialized,
    reloadPlots
  } = useCameraPlotData(rundownId, rundownTitle, readOnly, saveBlueprint);

  // Auto-save functionality - use the passed saveBlueprint function
  useCameraPlotAutoSave(
    plots,
    isInitialized,
    rundownId,
    rundownTitle,
    readOnly,
    saveBlueprint
  );

  // Scene operations
  const {
    createNewPlot,
    deletePlot,
    duplicatePlot,
    updatePlot,
    updateSceneName
  } = useCameraPlotSceneOperations(plots, setPlots, readOnly);

  const openPlotEditor = () => {
    const editorUrl = `/camera-plot-editor/${rundownId}`;
    window.open(editorUrl, '_blank');
  };

  return {
    plots,
    createNewPlot,
    deletePlot,
    duplicatePlot,
    updatePlot,
    updateSceneName,
    openPlotEditor,
    reloadPlots
  };
};
