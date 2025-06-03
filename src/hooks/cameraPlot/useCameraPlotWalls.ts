import { useState } from 'react';

export const useCameraPlotWalls = () => {
  const [isDrawingWall, setIsDrawingWall] = useState(false);
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null);
  const [wallPreview, setWallPreview] = useState<{ x: number; y: number } | null>(null);

  const startWallDrawing = (x: number, y: number) => {
    const point = { x, y };
    console.log('Starting wall drawing at:', point);
    setIsDrawingWall(true);
    setWallStart(point);
    setWallPreview(null);
  };

  const updateWallPreview = (point: { x: number; y: number }) => {
    if (isDrawingWall && wallStart) {
      setWallPreview(point);
    }
  };

  const completeWall = () => {
    console.log('Completing wall drawing');
    
    // Reset state but keep drawing mode active for continuous wall drawing
    setIsDrawingWall(false);
    setWallStart(null);
    setWallPreview(null);
  };

  const stopDrawingWalls = () => {
    console.log('Stopping wall drawing');
    setIsDrawingWall(false);
    setWallStart(null);
    setWallPreview(null);
  };

  return {
    isDrawingWall,
    wallStart,
    wallPreview,
    startWallDrawing,
    updateWallPreview,
    completeWall,
    stopDrawingWalls
  };
};
