
import { useWallDrawingState } from './useWallDrawingState';
import { useWallElementCreation } from './useWallElementCreation';
import { CameraPlotScene } from '@/hooks/useCameraPlot';

interface UseWallCanvasHandlersProps {
  selectedTool: string;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  activeScene: CameraPlotScene | undefined;
  updatePlot: (plotId: string, updatedPlot: Partial<CameraPlotScene>) => void;
  setSelectedTool: (tool: string) => void;
}

export const useWallCanvasHandlers = ({
  selectedTool,
  snapToGrid,
  activeScene,
  updatePlot,
  setSelectedTool
}: UseWallCanvasHandlersProps) => {
  const wallDrawing = useWallDrawingState();
  const { createWallElements } = useWallElementCreation(activeScene, updatePlot);

  const handleWallClick = (x: number, y: number) => {
    if (selectedTool !== 'wall') return false;

    // Always snap to grid for perfect connections
    const snapped = snapToGrid(x, y);
    console.log('Wall click at raw coords:', { x, y }, 'snapped to:', snapped);

    if (!wallDrawing.isDrawing) {
      console.log('Starting new wall drawing');
      wallDrawing.startDrawing(snapped);
    } else {
      console.log('Adding point to existing wall drawing');
      wallDrawing.addPoint(snapped);
    }

    return true;
  };

  const handleWallMouseMove = (x: number, y: number) => {
    if (selectedTool === 'wall' && wallDrawing.isDrawing) {
      // Always snap preview to grid for visual feedback
      const snapped = snapToGrid(x, y);
      wallDrawing.updatePreview(snapped);
    }
  };

  const handleWallDoubleClick = () => {
    if (selectedTool === 'wall' && wallDrawing.isDrawing) {
      console.log('Double click detected, finishing wall drawing');
      console.log('Current path before finishing:', wallDrawing.currentPath);
      
      if (wallDrawing.currentPath.length >= 2) {
        const segments = wallDrawing.finishDrawing();
        console.log('Generated wall segments:', segments);
        
        if (segments.length > 0) {
          console.log('Creating wall elements from segments...');
          createWallElements(segments);
          // Switch back to select tool after placing walls
          setSelectedTool('select');
        } else {
          console.log('No segments generated');
        }
      } else {
        console.log('Not enough points for wall creation, cancelling');
        wallDrawing.cancelDrawing();
        setSelectedTool('select');
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
