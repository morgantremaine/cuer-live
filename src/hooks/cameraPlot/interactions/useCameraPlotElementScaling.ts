
import { useState, useEffect } from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface UseCameraPlotElementScalingProps {
  element: CameraElement;
  canScale: boolean;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
}

export const useCameraPlotElementScaling = ({
  element,
  canScale,
  onUpdate
}: UseCameraPlotElementScalingProps) => {
  const [isScaling, setIsScaling] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const [scaleHandle, setScaleHandle] = useState<string>('');

  const startScaling = (e: React.MouseEvent) => {
    if (!canScale) return;
    
    e.stopPropagation();
    
    const target = e.target as HTMLElement;
    const handle = target.getAttribute('data-handle') || 'se';
    
    setIsScaling(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setInitialSize({ width: element.width, height: element.height });
    setInitialPos({ x: element.x, y: element.y });
    setScaleHandle(handle);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScaling || !canScale) return;
      
      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;
      
      let newWidth = initialSize.width;
      let newHeight = initialSize.height;
      let newX = initialPos.x;
      let newY = initialPos.y;
      
      // Check if it's a round table (furniture with equal width/height)
      const isRoundTable = element.type === 'furniture' && 
        element.label && (
          element.label.toLowerCase().includes('round') || 
          element.label.toLowerCase().includes('circle') ||
          initialSize.width === initialSize.height
        );
      
      switch (scaleHandle) {
        case 'nw': // Top-left
          if (isRoundTable) {
            const avgDelta = -(deltaX + deltaY) / 2;
            newWidth = Math.max(20, initialSize.width + avgDelta);
            newHeight = newWidth;
            newX = initialPos.x - (newWidth - initialSize.width);
            newY = initialPos.y - (newHeight - initialSize.height);
          } else {
            newWidth = Math.max(20, initialSize.width - deltaX);
            newHeight = Math.max(20, initialSize.height - deltaY);
            newX = initialPos.x + (initialSize.width - newWidth);
            newY = initialPos.y + (initialSize.height - newHeight);
          }
          break;
        case 'ne': // Top-right
          if (isRoundTable) {
            const avgDelta = (deltaX - deltaY) / 2;
            newWidth = Math.max(20, initialSize.width + avgDelta);
            newHeight = newWidth;
            newY = initialPos.y - (newHeight - initialSize.height);
          } else {
            newWidth = Math.max(20, initialSize.width + deltaX);
            newHeight = Math.max(20, initialSize.height - deltaY);
            newY = initialPos.y + (initialSize.height - newHeight);
          }
          break;
        case 'sw': // Bottom-left
          if (isRoundTable) {
            const avgDelta = (-deltaX + deltaY) / 2;
            newWidth = Math.max(20, initialSize.width + avgDelta);
            newHeight = newWidth;
            newX = initialPos.x - (newWidth - initialSize.width);
          } else {
            newWidth = Math.max(20, initialSize.width - deltaX);
            newHeight = Math.max(20, initialSize.height + deltaY);
            newX = initialPos.x + (initialSize.width - newWidth);
          }
          break;
        case 'se': // Bottom-right
          if (isRoundTable) {
            const avgDelta = (deltaX + deltaY) / 2;
            newWidth = Math.max(20, initialSize.width + avgDelta);
            newHeight = newWidth;
          } else {
            newWidth = Math.max(20, initialSize.width + deltaX);
            newHeight = Math.max(20, initialSize.height + deltaY);
          }
          break;
        case 'n': // Top center
          newHeight = Math.max(20, initialSize.height - deltaY);
          newY = initialPos.y + (initialSize.height - newHeight);
          if (isRoundTable) {
            newWidth = newHeight;
            newX = initialPos.x - (newWidth - initialSize.width) / 2;
          }
          break;
        case 's': // Bottom center
          newHeight = Math.max(20, initialSize.height + deltaY);
          if (isRoundTable) {
            newWidth = newHeight;
            newX = initialPos.x - (newWidth - initialSize.width) / 2;
          }
          break;
        case 'w': // Left center
          newWidth = Math.max(20, initialSize.width - deltaX);
          newX = initialPos.x + (initialSize.width - newWidth);
          if (isRoundTable) {
            newHeight = newWidth;
            newY = initialPos.y - (newHeight - initialSize.height) / 2;
          }
          break;
        case 'e': // Right center
          newWidth = Math.max(20, initialSize.width + deltaX);
          if (isRoundTable) {
            newHeight = newWidth;
            newY = initialPos.y - (newHeight - initialSize.height) / 2;
          }
          break;
      }
      
      onUpdate(element.id, {
        width: newWidth,
        height: newHeight,
        x: newX,
        y: newY
      });
    };

    const handleMouseUp = () => {
      setIsScaling(false);
    };

    if (isScaling) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScaling, element.id, onUpdate, canScale, startPos, initialSize, initialPos, scaleHandle]);

  return {
    isScaling,
    startScaling
  };
};
