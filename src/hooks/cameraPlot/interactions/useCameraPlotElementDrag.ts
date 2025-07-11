
import { useState, useEffect, useRef, useCallback } from 'react';
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
  const rafRef = useRef<number>();

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const newPos = snapToGrid(dragStart.elementX + deltaX, dragStart.elementY + deltaY);
    
    // Only update if position has actually changed by at least 1 pixel
    if (!lastUpdateRef.current || 
        Math.abs(lastUpdateRef.current.x - newPos.x) > 0.5 || 
        Math.abs(lastUpdateRef.current.y - newPos.y) > 0.5) {
      
      // Cancel any pending RAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      rafRef.current = requestAnimationFrame(() => {
        lastUpdateRef.current = newPos;
        onUpdate(element.id, {
          x: newPos.x,
          y: newPos.y
        });
      });
    }
  }, [isDragging, dragStart, element.id, onUpdate, snapToGrid]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    lastUpdateRef.current = null;
    
    // Cancel any pending RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
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
    if (isDragging) {
      // Add event listeners to document to capture mouse events outside the element
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Also listen for mouse leave to stop dragging if mouse leaves the window
      document.addEventListener('mouseleave', handleMouseUp);
      
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
      
      // Restore text selection
      document.body.style.userSelect = '';
      
      // Cancel any pending RAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    isDragging,
    startDrag
  };
};
