
import { useState, useEffect, useRef } from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface UseCameraPlotElementDragProps {
  element: CameraElement;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

export const useCameraPlotElementDrag = ({
  element,
  onUpdate,
  snapToGrid
}: UseCameraPlotElementDragProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ 
    x: 0, 
    y: 0, 
    elementX: 0, 
    elementY: 0
  });
  const lastUpdateRef = useRef<{ x: number; y: number } | null>(null);

  const startDrag = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elementX: element.x,
      elementY: element.y
    });
    lastUpdateRef.current = null;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const newPos = snapToGrid(dragStart.elementX + deltaX, dragStart.elementY + deltaY);
      
      // Only update if position has actually changed
      if (!lastUpdateRef.current || 
          lastUpdateRef.current.x !== newPos.x || 
          lastUpdateRef.current.y !== newPos.y) {
        lastUpdateRef.current = newPos;
        onUpdate(element.id, {
          x: newPos.x,
          y: newPos.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      lastUpdateRef.current = null;
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, element.id, onUpdate, snapToGrid]);

  return {
    isDragging,
    startDrag
  };
};
