import { useState, useEffect, useCallback, useRef } from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface SimpleElementDragProps {
  element: CameraElement;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  zoom: number;
  pan: { x: number; y: number };
}

export const useSimpleElementDrag = ({
  element,
  onUpdate,
  snapToGrid,
  zoom,
  pan
}: SimpleElementDragProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState({ x: 0, y: 0 });
  const updateTimeoutRef = useRef<number>();

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ x: element.x, y: element.y });
  }, [element.x, element.y]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = (e.clientX - dragStart.x) / zoom;
    const deltaY = (e.clientY - dragStart.y) / zoom;
    
    const newX = elementStart.x + deltaX;
    const newY = elementStart.y + deltaY;
    const snapped = snapToGrid(newX, newY);

    // Debounce updates for smooth dragging
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = window.setTimeout(() => {
      onUpdate(element.id, {
        x: snapped.x,
        y: snapped.y
      });
    }, 16); // ~60fps
  }, [isDragging, dragStart, elementStart, zoom, snapToGrid, onUpdate, element.id]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    // Clear any pending update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    isDragging,
    startDrag
  };
};