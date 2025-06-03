
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
  const [isInRotationZone, setIsInRotationZone] = useState(false);
  const [isInScaleZone, setIsInScaleZone] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging || isRotating || isScaling) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const relativeY = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const distance = Math.sqrt(
      Math.pow(relativeX - centerX, 2) + Math.pow(relativeY - centerY, 2)
    );
    
    const elementRadius = Math.min(rect.width, rect.height) / 2;
    const rotationZoneInner = elementRadius + 5;
    const rotationZoneOuter = elementRadius + 25;
    
    // Check if in rotation zone (slightly outside element)
    if (canRotate && distance >= rotationZoneInner && distance <= rotationZoneOuter) {
      setIsInRotationZone(true);
      setIsInScaleZone(false);
    } else if (canScale) {
      // Check if near corners for scaling
      const cornerThreshold = 15;
      const nearCorner = (
        (relativeX < cornerThreshold && relativeY < cornerThreshold) ||
        (relativeX > rect.width - cornerThreshold && relativeY < cornerThreshold) ||
        (relativeX < cornerThreshold && relativeY > rect.height - cornerThreshold) ||
        (relativeX > rect.width - cornerThreshold && relativeY > rect.height - cornerThreshold)
      );
      
      setIsInRotationZone(false);
      setIsInScaleZone(nearCorner);
    } else {
      setIsInRotationZone(false);
      setIsInScaleZone(false);
    }
  };

  const handleMouseLeave = () => {
    setIsInRotationZone(false);
    setIsInScaleZone(false);
  };

  const getCursor = () => {
    if (isDragging) return 'grabbing';
    if (isRotating) return 'grabbing';
    if (isScaling) return 'nw-resize';
    if (isInRotationZone) return 'grab';
    if (isInScaleZone) return 'nw-resize';
    return 'move';
  };

  return {
    isInRotationZone,
    isInScaleZone,
    handleMouseMove,
    handleMouseLeave,
    getCursor
  };
};
