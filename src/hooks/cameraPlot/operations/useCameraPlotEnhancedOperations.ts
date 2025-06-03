
export interface CameraPlotOperationsProps {
  selectedTool: string;
  isDrawingWall: boolean;
  wallStart: { x: number; y: number } | null;
  baseAddElement: (type: string, x: number, y: number, wallStart?: { x: number; y: number } | null, onWallComplete?: () => void) => void;
  startWallDrawing: (point: { x: number; y: number }) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

export const useCameraPlotEnhancedOperations = ({
  selectedTool,
  isDrawingWall,
  wallStart,
  baseAddElement,
  startWallDrawing,
  snapToGrid
}: CameraPlotOperationsProps) => {
  const addElement = (type: string, x: number, y: number) => {
    if (type === 'wall') {
      if (!isDrawingWall) {
        const snapped = snapToGrid(x, y);
        startWallDrawing(snapped);
        return;
      } else if (wallStart) {
        baseAddElement(type, x, y, wallStart, () => {
          const snapped = snapToGrid(x, y);
          startWallDrawing(snapped);
        });
        return;
      }
    }

    baseAddElement(type, x, y);
  };

  return {
    addElement
  };
};
