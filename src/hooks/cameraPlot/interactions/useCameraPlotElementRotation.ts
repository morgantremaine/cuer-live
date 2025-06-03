
import { useState, useEffect } from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface UseCameraPlotElementRotationProps {
  element: CameraElement;
  canRotate: boolean;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
}

export const useCameraPlotElementRotation = ({
  element,
  canRotate,
  onUpdate
}: UseCameraPlotElementRotationProps) => {
  const [isRotating, setIsRotating] = useState(false);

  const startRotation = () => {
    if (!canRotate) return;
    setIsRotating(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isRotating || !canRotate) return;
      
      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;
      
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
      
      onUpdate(element.id, {
        rotation: angle
      });
    };

    const handleMouseUp = () => {
      setIsRotating(false);
    };

    if (isRotating) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isRotating, element, onUpdate, canRotate]);

  return {
    isRotating,
    startRotation
  };
};
