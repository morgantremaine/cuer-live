
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
    console.log('Wall click at:', snapped);

    if (!wallDrawing.isDrawing) {
      console.log('Starting new wall');
      wallDrawing.startDrawing(snapped);
    } else {
      console.log('Adding point to existing wall');
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
    if (selectedTool === 'wall' && wallDrawing.isDrawing) {
      console.log('Double click detected, finishing wall drawing');
      console.log('Current path length:', wallDrawing.currentPath.length);
      
      if (wallDrawing.currentPath.length >= 2) {
        const segments = wallDrawing.finishDrawing();
        console.log('Wall segments created:', segments);
        
        // Filter out segments that are too short (less than 5 pixels)
        const validSegments = segments.filter(segment => {
          const distance = Math.sqrt(
            Math.pow(segment.end.x - segment.start.x, 2) + 
            Math.pow(segment.end.y - segment.start.y, 2)
          );
          return distance > 5;
        });
        
        console.log('Valid segments after filtering:', validSegments);
        
        if (validSegments.length > 0) {
          console.log('Creating wall elements...');
          createWallElements(validSegments);
        } else {
          console.log('No valid segments to create');
        }
      } else {
        console.log('Not enough points to create wall');
        wallDrawing.cancelDrawing();
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
