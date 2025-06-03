
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

export const useWallDrawingState = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<WallPoint[]>([]);
  const [previewPoint, setPreviewPoint] = useState<WallPoint | null>(null);

  const startDrawing = (point: WallPoint) => {
    console.log('Starting wall drawing at:', point);
    setIsDrawing(true);
    setCurrentPath([point]);
    setPreviewPoint(null);
  };

  const addPoint = (point: WallPoint) => {
    console.log('Adding wall point:', point);
    setCurrentPath(prev => [...prev, point]);
  };

  const updatePreview = (point: WallPoint) => {
    if (isDrawing) {
      setPreviewPoint(point);
    }
  };

  const finishDrawing = (): WallSegment[] => {
    console.log('Finishing wall drawing with path:', currentPath);
    const segments: WallSegment[] = [];
    
    for (let i = 0; i < currentPath.length - 1; i++) {
      const segment = {
        id: `wall-${Date.now()}-${i}-${Math.random()}`,
        start: currentPath[i],
        end: currentPath[i + 1]
      };
      segments.push(segment);
    }
    
    console.log('Created wall segments:', segments);
    
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
