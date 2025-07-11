import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CameraElement } from '@/hooks/useCameraPlot';

export interface WallPoint {
  x: number;
  y: number;
}

export const useSimpleWallDrawing = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [wallPoints, setWallPoints] = useState<WallPoint[]>([]);
  const [previewPoint, setPreviewPoint] = useState<WallPoint | null>(null);

  const startWallDrawing = useCallback((point: WallPoint) => {
    setIsDrawing(true);
    setWallPoints([point]);
    setPreviewPoint(null);
  }, []);

  const addWallPoint = useCallback((point: WallPoint) => {
    if (!isDrawing) return;
    setWallPoints(prev => [...prev, point]);
  }, [isDrawing]);

  const updatePreview = useCallback((point: WallPoint) => {
    if (!isDrawing) return;
    setPreviewPoint(point);
  }, [isDrawing]);

  const finishWallDrawing = useCallback((): CameraElement[] => {
    if (wallPoints.length < 2) {
      setIsDrawing(false);
      setWallPoints([]);
      setPreviewPoint(null);
      return [];
    }

    const wallElements: CameraElement[] = [];
    
    // Create wall segments between consecutive points
    for (let i = 0; i < wallPoints.length - 1; i++) {
      const start = wallPoints[i];
      const end = wallPoints[i + 1];
      
      const length = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );
      
      const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
      
      const centerX = (start.x + end.x) / 2;
      const centerY = (start.y + end.y) / 2;
      
      const wallElement: CameraElement = {
        id: uuidv4(),
        type: 'wall',
        x: centerX - length / 2,
        y: centerY - 2,
        width: length,
        height: 4,
        rotation: angle,
        scale: 1,
        label: ''
      };
      
      wallElements.push(wallElement);
    }

    setIsDrawing(false);
    setWallPoints([]);
    setPreviewPoint(null);
    
    return wallElements;
  }, [wallPoints]);

  const cancelWallDrawing = useCallback(() => {
    setIsDrawing(false);
    setWallPoints([]);
    setPreviewPoint(null);
  }, []);

  return {
    isDrawing,
    wallPoints,
    previewPoint,
    startWallDrawing,
    addWallPoint,
    updatePreview,
    finishWallDrawing,
    cancelWallDrawing
  };
};