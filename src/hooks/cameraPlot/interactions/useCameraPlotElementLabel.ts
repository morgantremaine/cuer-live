
import { useState, useEffect } from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface UseCameraPlotElementLabelProps {
  element: CameraElement;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
}

export const useCameraPlotElementLabel = ({
  element,
  onUpdate
}: UseCameraPlotElementLabelProps) => {
  const [isLabelDragging, setIsLabelDragging] = useState(false);
  const [labelDragStart, setLabelDragStart] = useState({
    x: 0,
    y: 0,
    elementX: 0,
    elementY: 0
  });

  const startLabelDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLabelDragging(true);
    setLabelDragStart({
      x: e.clientX,
      y: e.clientY,
      elementX: element.labelOffsetX || 0,
      elementY: element.labelOffsetY || 0
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isLabelDragging) return;
      
      const deltaX = e.clientX - labelDragStart.x;
      const deltaY = e.clientY - labelDragStart.y;
      
      onUpdate(element.id, {
        labelOffsetX: labelDragStart.elementX + deltaX,
        labelOffsetY: labelDragStart.elementY + deltaY
      });
    };

    const handleMouseUp = () => {
      setIsLabelDragging(false);
    };

    if (isLabelDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isLabelDragging, labelDragStart, element.id, onUpdate]);

  return {
    isLabelDragging,
    startLabelDrag
  };
};
