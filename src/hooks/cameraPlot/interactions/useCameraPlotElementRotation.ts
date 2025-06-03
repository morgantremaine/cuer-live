
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
  const [startAngle, setStartAngle] = useState(0);
  const [initialRotation, setInitialRotation] = useState(0);

  const startRotation = (e: React.MouseEvent) => {
    if (!canRotate) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    
    setIsRotating(true);
    setStartAngle(angle);
    setInitialRotation(element.rotation || 0);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isRotating || !canRotate) return;
      
      // Get element center from DOM
      const elementDiv = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      if (!elementDiv) return;
      
      const rect = elementDiv.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const deltaAngle = currentAngle - startAngle;
      const newRotation = initialRotation + (deltaAngle * 180 / Math.PI);
      
      onUpdate(element.id, {
        rotation: newRotation
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
  }, [isRotating, element.id, onUpdate, canRotate, startAngle, initialRotation]);

  return {
    isRotating,
    startRotation
  };
};
