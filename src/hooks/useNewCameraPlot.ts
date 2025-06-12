
import { useCallback } from 'react';
import { CameraPlotScene } from '@/hooks/cameraPlot/core/useCameraPlotData';

interface UseNewCameraPlotProps {
  plots: CameraPlotScene[];
  updateCameraPlots: (plots: CameraPlotScene[]) => void;
  readOnly?: boolean;
}

export const useNewCameraPlot = ({ plots, updateCameraPlots, readOnly = false }: UseNewCameraPlotProps) => {
  
  const createNewPlot = useCallback((name: string) => {
    if (readOnly) return;
    
    const newPlot: CameraPlotScene = {
      id: `scene-${Date.now()}`,
      name,
      elements: []
    };
    
    updateCameraPlots([...plots, newPlot]);
  }, [plots, updateCameraPlots, readOnly]);

  const deletePlot = useCallback((plotId: string) => {
    if (readOnly) return;
    
    updateCameraPlots(plots.filter(plot => plot.id !== plotId));
  }, [plots, updateCameraPlots, readOnly]);

  const duplicatePlot = useCallback((plotId: string) => {
    if (readOnly) return;
    
    const plotToDuplicate = plots.find(plot => plot.id === plotId);
    if (!plotToDuplicate) return;

    const duplicatedPlot: CameraPlotScene = {
      ...plotToDuplicate,
      id: `scene-${Date.now()}`,
      name: `${plotToDuplicate.name} (Copy)`,
      elements: plotToDuplicate.elements.map(element => ({
        ...element,
        id: `${element.id}-copy-${Date.now()}`
      }))
    };
    
    updateCameraPlots([...plots, duplicatedPlot]);
  }, [plots, updateCameraPlots, readOnly]);

  const updatePlot = useCallback((plotId: string, updatedPlot: CameraPlotScene) => {
    if (readOnly) return;
    
    updateCameraPlots(
      plots.map(plot => plot.id === plotId ? updatedPlot : plot)
    );
  }, [plots, updateCameraPlots, readOnly]);

  const updateSceneName = useCallback((plotId: string, newName: string) => {
    if (readOnly) return;
    
    updateCameraPlots(
      plots.map(plot => 
        plot.id === plotId ? { ...plot, name: newName } : plot
      )
    );
  }, [plots, updateCameraPlots, readOnly]);

  const openPlotEditor = useCallback((rundownId: string) => {
    const editorUrl = `/camera-plot-editor/${rundownId}`;
    window.open(editorUrl, '_blank');
  }, []);

  return {
    plots,
    createNewPlot,
    deletePlot,
    duplicatePlot,
    updatePlot,
    updateSceneName,
    openPlotEditor
  };
};
