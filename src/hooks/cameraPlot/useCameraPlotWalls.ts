import { useState } from 'react';

export const useCameraPlotWalls = () => {
  const [isDrawingWall, setIsDrawingWall] = useState(false);
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null);
  const [wallPreview, setWallPreview] = useState<{ x: number; y: number } | null>(null);

  const startWallDrawing = (point: { x: number; y: number }) => {
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

  const completeWall = (endPoint: { x: number; y: number }) => {
    console.log('Completing wall from:', wallStart, 'to:', endPoint);
    const result = { start: wallStart, end: endPoint };
    
    // Reset state but keep drawing mode active for continuous wall drawing
    setWallStart(endPoint); // Start next wall from this point
    setWallPreview(null);
    
    return result;
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
