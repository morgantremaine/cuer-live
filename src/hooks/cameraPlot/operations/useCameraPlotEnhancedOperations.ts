
export interface CameraPlotOperationsProps {
  selectedTool: string;
  isDrawingWall: boolean;
  wallStart: { x: number; y: number } | null;
  baseAddElement: (type: string, x: number, y: number, wallData?: { start: { x: number; y: number }, end: { x: number; y: number } }) => void;
  startWallDrawing: (point: { x: number; y: number }) => void;
  completeWall: (endPoint: { x: number; y: number }) => { start: { x: number; y: number }, end: { x: number; y: number } } | null;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

export const useCameraPlotEnhancedOperations = ({
  selectedTool,
  isDrawingWall,
  wallStart,
  baseAddElement,
  startWallDrawing,
  completeWall,
  snapToGrid
}: CameraPlotOperationsProps) => {
  const addElement = (type: string, x: number, y: number) => {
    const snapped = snapToGrid(x, y);
    
    if (type === 'wall') {
      if (!isDrawingWall) {
        // Start drawing a wall
        startWallDrawing(snapped);
        return;
      } else if (wallStart) {
        // Complete the wall
        const wallData = completeWall(snapped);
        if (wallData) {
          baseAddElement('wall', x, y, wallData);
        }
        return;
      }
    }

    // For non-wall elements
    baseAddElement(type, snapped.x, snapped.y);
  };

  return {
    addElement
  };
};
