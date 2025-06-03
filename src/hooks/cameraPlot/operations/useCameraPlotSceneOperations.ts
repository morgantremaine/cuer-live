
import { CameraPlotScene } from '../core/useCameraPlotData';

export const useCameraPlotSceneOperations = (
  plots: CameraPlotScene[],
  setPlots: (plots: CameraPlotScene[]) => void,
  readOnly: boolean
) => {
  const createNewPlot = (name: string) => {
    if (readOnly) {
      return null;
    }
    
    const newPlot: CameraPlotScene = {
      id: `plot-${Date.now()}-${Math.random()}`,
      name,
      elements: []
    };
    setPlots([...plots, newPlot]);
    return newPlot;
  };

  const deletePlot = (plotId: string) => {
    if (readOnly) {
      return;
    }
    
    setPlots(plots.filter(plot => plot.id !== plotId));
  };

  const duplicatePlot = (plotId: string) => {
    if (readOnly) {
      return null;
    }
    
    const plotToDuplicate = plots.find(plot => plot.id === plotId);
    if (plotToDuplicate) {
      const duplicatedPlot: CameraPlotScene = {
        ...plotToDuplicate,
        id: `plot-${Date.now()}-${Math.random()}`,
        name: `${plotToDuplicate.name} (Copy)`,
        elements: plotToDuplicate.elements.map(element => ({
          ...element,
          id: `element-${Date.now()}-${Math.random()}`
        }))
      };
      setPlots([...plots, duplicatedPlot]);
      return duplicatedPlot;
    }
  };

  const updatePlot = (plotId: string, updatedPlot: Partial<CameraPlotScene>) => {
    if (readOnly) {
      return;
    }
    
    setPlots(plots.map(plot => 
      plot.id === plotId ? { ...plot, ...updatedPlot } : plot
    ));
  };

  const updateSceneName = (sceneId: string, name: string) => {
    if (readOnly) {
      return;
    }
    
    updatePlot(sceneId, { name });
  };

  return {
    createNewPlot,
    deletePlot,
    duplicatePlot,
    updatePlot,
    updateSceneName
  };
};
