
import { useState } from 'react';

export const useCameraPlotWalls = () => {
  const [isDrawingWall, setIsDrawingWall] = useState(false);
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null);

  const startWallDrawing = (point: { x: number; y: number }) => {
    setIsDrawingWall(true);
    setWallStart(point);
  };

  const stopDrawingWalls = () => {
    setIsDrawingWall(false);
    setWallStart(null);
  };

  return {
    isDrawingWall,
    wallStart,
    startWallDrawing,
    stopDrawingWalls
  };
};
