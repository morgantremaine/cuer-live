
import { useState } from 'react';

export interface WallPoint {
  x: number;
  y: number;
}

export interface WallSegment {
  id: string;
  start: WallPoint;
  end: WallPoint;
}

export const useCameraPlotWallDrawing = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<WallPoint[]>([]);
  const [previewPoint, setPreviewPoint] = useState<WallPoint | null>(null);

  const startDrawing = (point: WallPoint) => {
    setIsDrawing(true);
    setCurrentPath([point]);
    setPreviewPoint(null);
  };

  const addPoint = (point: WallPoint) => {
    setCurrentPath(prev => [...prev, point]);
  };

  const updatePreview = (point: WallPoint) => {
    if (isDrawing) {
      setPreviewPoint(point);
    }
  };

  const finishDrawing = () => {
    const segments: WallSegment[] = [];
    
    for (let i = 0; i < currentPath.length - 1; i++) {
      const segment = {
        id: `wall-${Date.now()}-${i}`,
        start: currentPath[i],
        end: currentPath[i + 1]
      };
      segments.push(segment);
    }
    
    setIsDrawing(false);
    setCurrentPath([]);
    setPreviewPoint(null);
    
    return segments;
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setCurrentPath([]);
    setPreviewPoint(null);
  };

  return {
    isDrawing,
    currentPath,
    previewPoint,
    startDrawing,
    addPoint,
    updatePreview,
    finishDrawing,
    cancelDrawing
  };
};
