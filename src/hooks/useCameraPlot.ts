
import { useCameraPlotData } from './cameraPlot/core/useCameraPlotData';
import { useCameraPlotAutoSave } from './cameraPlot/core/useCameraPlotAutoSave';
import { useCameraPlotSceneOperations } from './cameraPlot/operations/useCameraPlotSceneOperations';

// Re-export types for backwards compatibility
export type { CameraElement, CameraPlotScene, CameraPlotData } from './cameraPlot/core/useCameraPlotData';

export const useCameraPlot = (rundownId: string, rundownTitle: string, readOnly = false) => {
  const {
    plots,
    setPlots,
    isInitialized,
    reloadPlots,
    savedBlueprint,
    saveBlueprint
  } = useCameraPlotData(rundownId, rundownTitle, readOnly);

  // Auto-save functionality
  useCameraPlotAutoSave(
    plots,
    isInitialized,
    rundownId,
    rundownTitle,
    readOnly,
    savedBlueprint,
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
