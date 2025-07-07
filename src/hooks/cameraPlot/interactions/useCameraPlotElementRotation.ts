
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
    
    e.stopPropagation();
    
    const elementRect = e.currentTarget.closest('[data-element-id]')?.getBoundingClientRect();
    if (!elementRect) return;
    
    const centerX = elementRect.left + elementRect.width / 2;
    const centerY = elementRect.top + elementRect.height / 2;
    
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    
    setIsRotating(true);
    setStartAngle(angle);
    setInitialRotation(element.rotation || 0);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isRotating || !canRotate) return;
      
      const elementDiv = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      if (!elementDiv) return;
      
      const rect = elementDiv.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const deltaAngle = currentAngle - startAngle;
      const newRotation = initialRotation + (deltaAngle * 180 / Math.PI);
      
      onUpdate(element.id, {
        rotation: newRotation % 360
      });
    };

    const handleMouseUp = () => {
      setIsRotating(false);
    };

    if (isRotating) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Prevent text selection and other interactions while rotating
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
      
      // Allow pointer events on the current element to continue tracking
      const elementDiv = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      if (elementDiv) {
        elementDiv.style.pointerEvents = 'auto';
      }
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Restore normal interactions with proper defaults
      document.body.style.userSelect = 'auto';
      document.body.style.pointerEvents = 'auto';
      
      const elementDiv = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      if (elementDiv) {
        elementDiv.style.pointerEvents = '';
      }
    };
  }, [isRotating, element.id, onUpdate, canRotate, startAngle, initialRotation]);

  return {
    isRotating,
    startRotation
  };
};
