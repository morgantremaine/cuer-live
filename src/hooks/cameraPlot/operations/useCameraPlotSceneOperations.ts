
import { CameraPlotScene } from '../core/useCameraPlotData';

export const useCameraPlotSceneOperations = (
  plots: CameraPlotScene[],
  setPlots: (plots: CameraPlotScene[]) => void,
  readOnly: boolean
) => {
  const createNewPlot = (name: string) => {
    console.log('🎬 Creating new plot:', name, 'readOnly:', readOnly, 'current plots:', plots.length);
    if (readOnly) {
      console.log('🚫 Cannot create plot - read only mode');
      return null;
    }
    
    const newPlot: CameraPlotScene = {
      id: `plot-${Date.now()}-${Math.random()}`,
      name,
      elements: []
    };
    
    const newPlots = [newPlot, ...plots];
    console.log('🎬 Setting new plots array:', newPlots.length, 'items');
    // Add new plot at the beginning of the array (newest first)
    setPlots(newPlots);
    return newPlot;
  };

  const deletePlot = (plotId: string) => {
    console.log('🎬 Deleting plot:', plotId, 'readOnly:', readOnly, 'current plots:', plots.length);
    if (readOnly) {
      console.log('🚫 Cannot delete plot - read only mode');
      return;
    }
    
    const newPlots = plots.filter(plot => plot.id !== plotId);
    console.log('🎬 Setting filtered plots array:', newPlots.length, 'items');
    setPlots(newPlots);
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
      
      // Add duplicated plot at the beginning of the array (newest first)
      setPlots([duplicatedPlot, ...plots]);
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
