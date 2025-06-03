
import { useCameraPlotElementCreation } from './useCameraPlotElementCreation';
import { CameraPlotScene } from '@/hooks/useCameraPlot';

interface UseCameraPlotEnhancedOperationsProps {
  selectedTool: string;
  isDrawingWall: boolean;
  wallStart: { x: number; y: number } | null;
  baseAddElement: (type: string, x: number, y: number) => void;
  startWallDrawing: (point: { x: number; y: number }) => void;
  completeWall: (end: { x: number; y: number }) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  activeScene: CameraPlotScene | undefined;
  updatePlot: (plotId: string, updatedPlot: Partial<CameraPlotScene>) => void;
  setSelectedTool: (tool: string) => void;
}

export const useCameraPlotEnhancedOperations = ({
  selectedTool,
  isDrawingWall,
  wallStart,
  baseAddElement,
  startWallDrawing,
  completeWall,
  snapToGrid,
  activeScene,
  updatePlot,
  setSelectedTool
}: UseCameraPlotEnhancedOperationsProps) => {
  const { addElement: createElementDirectly } = useCameraPlotElementCreation(
    activeScene,
    updatePlot,
    setSelectedTool
  );

  const addElement = (type: string, x: number, y: number) => {
    if (type === 'wall') {
      const snapped = snapToGrid(x, y);
      
      if (!isDrawingWall) {
        startWallDrawing(snapped);
      } else if (wallStart) {
        completeWall(snapped);
      }
    } else {
      // Use the enhanced element creation that includes auto tool switching
      createElementDirectly(type, x, y);
    }
  };

  return {
    addElement
  };
};
