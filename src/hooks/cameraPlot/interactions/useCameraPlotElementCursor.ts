
import { useState } from 'react';

interface UseCameraPlotElementCursorProps {
  canRotate: boolean;
  canScale: boolean;
  isDragging: boolean;
  isRotating: boolean;
  isScaling: boolean;
}

export const useCameraPlotElementCursor = ({
  canRotate,
  canScale,
  isDragging,
  isRotating,
  isScaling
}: UseCameraPlotElementCursorProps) => {
  const [cursorMode, setCursorMode] = useState<'normal' | 'rotate' | 'scale'>('normal');

  const handleMouseMove = (e: React.MouseEvent, rect: DOMRect) => {
    if (isDragging || isRotating || isScaling) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.sqrt(
      Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
    );
    const elementRadius = Math.min(rect.width, rect.height) / 2;

    // Rotation zone: slightly outside the element
    if (canRotate && distance > elementRadius + 5 && distance < elementRadius + 25) {
      setCursorMode('rotate');
    } else if (canScale) {
      // For furniture, check if we're near corners for scaling
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;
      const cornerThreshold = 12;
      
      const nearCorner = (
        (relativeX < cornerThreshold && relativeY < cornerThreshold) ||
        (relativeX > rect.width - cornerThreshold && relativeY < cornerThreshold) ||
        (relativeX < cornerThreshold && relativeY > rect.height - cornerThreshold) ||
        (relativeX > rect.width - cornerThreshold && relativeY > rect.height - cornerThreshold)
      );
      
      setCursorMode(nearCorner ? 'scale' : 'normal');
    } else {
      setCursorMode('normal');
    }
  };

  const getCursor = () => {
    if (isDragging) return 'grabbing';
    if (isRotating) return 'grab';
    if (isScaling) return 'nw-resize';
    
    switch (cursorMode) {
      case 'rotate': return 'grab';
      case 'scale': return 'nw-resize';
      default: return 'grab';
    }
  };

  return {
    cursorMode,
    handleMouseMove,
    getCursor
  };
};
