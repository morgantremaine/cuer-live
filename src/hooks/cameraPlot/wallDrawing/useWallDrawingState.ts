
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
    console.log('Current path before adding:', currentPath);
    const newPath = [...currentPath, point];
    console.log('New path after adding:', newPath);
    setCurrentPath(newPath);
  };

  const updatePreview = (point: WallPoint) => {
    if (isDrawing) {
      setPreviewPoint(point);
    }
  };

  const finishDrawing = (): WallSegment[] => {
    console.log('Finishing wall drawing with path:', currentPath);
    
    if (currentPath.length < 2) {
      console.log('Not enough points to create wall segments');
      setIsDrawing(false);
      setCurrentPath([]);
      setPreviewPoint(null);
      return [];
    }
    
    const segments: WallSegment[] = [];
    const timestamp = Date.now();
    
    // Create segments connecting consecutive points
    for (let i = 0; i < currentPath.length - 1; i++) {
      const segment: WallSegment = {
        id: `wall-${timestamp}-${i}`,
        start: currentPath[i],
        end: currentPath[i + 1]
      };
      segments.push(segment);
      console.log(`Created segment ${i + 1}:`, segment);
    }
    
    console.log('All segments created:', segments);
    
    setIsDrawing(false);
    setCurrentPath([]);
    setPreviewPoint(null);
    
    return segments;
  };

  const cancelDrawing = () => {
    console.log('Cancelling wall drawing');
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
