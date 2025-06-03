
import { useWallDrawingState } from './useWallDrawingState';
import { useWallElementCreation } from './useWallElementCreation';
import { CameraPlotScene } from '@/hooks/useCameraPlot';

interface UseWallCanvasHandlersProps {
  selectedTool: string;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  activeScene: CameraPlotScene | undefined;
  updatePlot: (plotId: string, updatedPlot: Partial<CameraPlotScene>) => void;
}

export const useWallCanvasHandlers = ({
  selectedTool,
  snapToGrid,
  activeScene,
  updatePlot
}: UseWallCanvasHandlersProps) => {
  const wallDrawing = useWallDrawingState();
  const { createWallElements } = useWallElementCreation(activeScene, updatePlot);

  const handleWallClick = (x: number, y: number) => {
    if (selectedTool !== 'wall') return false;

    const snapped = snapToGrid(x, y);

    if (!wallDrawing.isDrawing) {
      wallDrawing.startDrawing(snapped);
    } else {
      wallDrawing.addPoint(snapped);
    }

    return true;
  };

  const handleWallMouseMove = (x: number, y: number) => {
    if (selectedTool === 'wall' && wallDrawing.isDrawing) {
      const snapped = snapToGrid(x, y);
      wallDrawing.updatePreview(snapped);
    }
  };

  const handleWallDoubleClick = () => {
    if (selectedTool === 'wall' && wallDrawing.isDrawing && wallDrawing.currentPath.length > 1) {
      console.log('Double click detected, finishing wall');
      const segments = wallDrawing.finishDrawing();
      
      // Filter out segments that are too short
      const validSegments = segments.filter(segment => {
        const distance = Math.sqrt(
          Math.pow(segment.end.x - segment.start.x, 2) + 
          Math.pow(segment.end.y - segment.start.y, 2)
        );
        return distance > 5;
      });
      
      if (validSegments.length > 0) {
        createWallElements(validSegments);
      }
      
      return true;
    }
    return false;
  };

  return {
    ...wallDrawing,
    handleWallClick,
    handleWallMouseMove,
    handleWallDoubleClick
  };
};
