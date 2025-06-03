
import { useState, useEffect } from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface UseCameraPlotElementScalingProps {
  element: CameraElement;
  canScale: boolean;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
}

export const useCameraPlotElementScaling = ({
  element,
  canScale,
  onUpdate
}: UseCameraPlotElementScalingProps) => {
  const [isScaling, setIsScaling] = useState(false);
  const [scaleStart, setScaleStart] = useState({ 
    x: 0, 
    y: 0, 
    initialWidth: 0, 
    initialHeight: 0 
  });

  const startScaling = (e: React.MouseEvent) => {
    if (!canScale) return;
    setIsScaling(true);
    setScaleStart({
      x: e.clientX,
      y: e.clientY,
      initialWidth: element.width,
      initialHeight: element.height
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScaling || !canScale) return;
      
      const deltaX = e.clientX - scaleStart.x;
      const deltaY = e.clientY - scaleStart.y;
      
      const scaleFactorX = 1 + deltaX / 100;
      const scaleFactorY = 1 + deltaY / 100;
      
      const newWidth = Math.max(20, scaleStart.initialWidth * scaleFactorX);
      const newHeight = Math.max(20, scaleStart.initialHeight * scaleFactorY);
      
      onUpdate(element.id, {
        width: newWidth,
        height: newHeight
      });
    };

    const handleMouseUp = () => {
      setIsScaling(false);
    };

    if (isScaling) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScaling, scaleStart, element.id, onUpdate, canScale]);

  return {
    isScaling,
    startScaling
  };
};
