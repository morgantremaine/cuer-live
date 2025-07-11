
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

    if (!wallDrawing.isDrawing) {
      wallDrawing.startDrawing(snapped);
    } else {
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
      if (wallDrawing.currentPath.length >= 2) {
        const segments = wallDrawing.finishDrawing();
        
        if (segments.length > 0) {
          createWallElements(segments);
          // Switch back to select tool after placing walls
          setSelectedTool('select');
        }
      } else {
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
