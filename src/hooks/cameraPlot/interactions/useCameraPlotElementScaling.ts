
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

  const startScaling = (e: React.MouseEvent) => {
    if (!canScale) return;
    
    setIsScaling(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setInitialSize({ width: element.width, height: element.height });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScaling || !canScale) return;
      
      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;
      
      // Calculate the scale factor based on the larger delta
      const scaleFactor = Math.max(deltaX, deltaY) / 100;
      
      // Check if it's a round table (furniture with equal width/height)
      const isRoundTable = element.type === 'furniture' && initialSize.width === initialSize.height;
      
      let newWidth, newHeight;
      
      if (isRoundTable) {
        // For round tables, maintain aspect ratio
        const avgDelta = (Math.abs(deltaX) + Math.abs(deltaY)) / 2;
        const sizeChange = avgDelta * (deltaX + deltaY > 0 ? 1 : -1);
        newWidth = Math.max(20, initialSize.width + sizeChange);
        newHeight = newWidth; // Keep it perfectly round
      } else {
        // For rectangular furniture, allow free scaling
        newWidth = Math.max(20, initialSize.width + deltaX);
        newHeight = Math.max(20, initialSize.height + deltaY);
      }
      
      onUpdate(element.id, {
        width: newWidth,
        height: newHeight
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
  }, [isScaling, element.id, onUpdate, canScale, startPos, initialSize]);

  return {
    isScaling,
    startScaling
  };
};
