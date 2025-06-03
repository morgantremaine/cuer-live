
import { useCameraPlotElementCreation } from './useCameraPlotElementCreation';
import { CameraPlotScene } from '@/hooks/useCameraPlot';

interface UseCameraPlotEnhancedOperationsProps {
  selectedTool: string;
  isDrawingWall: boolean;
  wallStart: { x: number; y: number } | null;
  baseAddElement: (type: string, x: number, y: number) => void;
  startWallDrawing: (x: number, y: number) => void;
  completeWall: () => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  activeScene: CameraPlotScene | undefined;
  updatePlot: (plotId: string, updates: Partial<CameraPlotScene>) => void;
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
  // Remove the noisy log that was running constantly
  // console.log('useCameraPlotEnhancedOperations - activeScene:', activeScene?.id);

  const { addElement: createNewElement } = useCameraPlotElementCreation(
    activeScene,
    updatePlot,
    setSelectedTool
  );

  const addElement = (type: string, x: number, y: number) => {
    console.log('Enhanced addElement called with:', { type, x, y, activeSceneId: activeScene?.id });
    
    if (!activeScene) {
      console.log('No active scene for element creation');
      return;
    }

    // Handle wall tool differently
    if (type === 'wall') {
      const snappedPos = snapToGrid(x, y);
      if (!isDrawingWall) {
        startWallDrawing(snappedPos.x, snappedPos.y);
      } else {
        completeWall();
      }
      return;
    }

    // For non-wall elements, use the element creation logic
    createNewElement(type, x, y);
  };

  return {
    addElement
  };
};
