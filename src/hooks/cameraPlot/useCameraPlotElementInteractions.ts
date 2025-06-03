
import { useState, useEffect } from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface UseCameraPlotElementInteractionsProps {
  element: CameraElement;
  isSelected: boolean;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
  onSelect: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

export const useCameraPlotElementInteractions = ({
  element,
  isSelected,
  onUpdate,
  onSelect,
  snapToGrid
}: UseCameraPlotElementInteractionsProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [isLabelDragging, setIsLabelDragging] = useState(false);
  const [cursorMode, setCursorMode] = useState<'normal' | 'rotate' | 'scale'>('normal');
  const [dragStart, setDragStart] = useState({ 
    x: 0, 
    y: 0, 
    elementX: 0, 
    elementY: 0, 
    initialScale: 1, 
    initialRotation: 0,
    initialWidth: 0,
    initialHeight: 0
  });

  // Determine interaction capabilities
  const canRotate = element.type === 'camera' || element.type === 'person';
  const canScale = element.type === 'furniture';

  const handleMouseMove = (e: React.MouseEvent, rect: DOMRect) => {
    if (!isSelected) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.sqrt(
      Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
    );
    const elementRadius = Math.min(rect.width, rect.height) / 2;

    // Rotation zone: 10px outside the element
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.detail === 2) {
      return { isDoubleClick: true };
    }

    onSelect(element.id, e.ctrlKey || e.metaKey);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const commonDragStart = {
      x: e.clientX,
      y: e.clientY,
      elementX: element.x,
      elementY: element.y,
      initialScale: element.scale || 1,
      initialRotation: element.rotation || 0,
      initialWidth: element.width,
      initialHeight: element.height
    };

    if (cursorMode === 'rotate' && canRotate) {
      setIsRotating(true);
      setDragStart(commonDragStart);
    } else if (cursorMode === 'scale' && canScale) {
      setIsScaling(true);
      setDragStart(commonDragStart);
    } else {
      setIsDragging(true);
      setDragStart(commonDragStart);
    }

    return { isDoubleClick: false };
  };

  const handleLabelMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLabelDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elementX: element.labelOffsetX || 0,
      elementY: element.labelOffsetY || 0,
      initialScale: element.scale || 1,
      initialRotation: element.rotation || 0,
      initialWidth: element.width,
      initialHeight: element.height
    });
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

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const newPos = snapToGrid(dragStart.elementX + deltaX, dragStart.elementY + deltaY);
        onUpdate(element.id, {
          x: newPos.x,
          y: newPos.y
        });
      } else if (isLabelDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        onUpdate(element.id, {
          labelOffsetX: dragStart.elementX + deltaX,
          labelOffsetY: dragStart.elementY + deltaY
        });
      } else if (isRotating && canRotate) {
        const centerX = element.x + element.width / 2;
        const centerY = element.y + element.height / 2;
        
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
        
        onUpdate(element.id, {
          rotation: angle
        });
      } else if (isScaling && canScale) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        // Scale proportionally based on distance from start
        const scaleFactor = 1 + (deltaX + deltaY) / 200;
        const newScale = Math.max(0.3, Math.min(3, scaleFactor));
        
        onUpdate(element.id, {
          scale: newScale
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsLabelDragging(false);
      setIsRotating(false);
      setIsScaling(false);
    };

    if (isDragging || isLabelDragging || isRotating || isScaling) {
      document.addEventListener('mousemove', handleMouseMoveGlobal);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveGlobal);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isLabelDragging, isRotating, isScaling, dragStart, element, onUpdate, snapToGrid, canRotate, canScale]);

  return {
    handleMouseDown,
    handleLabelMouseDown,
    handleMouseMove,
    getCursor,
    cursorMode,
    isDragging,
    isRotating,
    isScaling
  };
};
