
import React from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';
import CameraPlotRotationHandle from './CameraPlotRotationHandle';
import CameraPlotScaleHandles from './CameraPlotScaleHandles';

interface CameraPlotElementHandlesProps {
  element: CameraElement;
  isSelected: boolean;
  onRotationStart?: (e: React.MouseEvent) => void;
  onScaleStart?: (e: React.MouseEvent) => void;
  isRotating?: boolean;
  isScaling?: boolean;
}

const CameraPlotElementHandles = ({ 
  element, 
  isSelected, 
  onRotationStart,
  onScaleStart,
  isRotating,
  isScaling 
}: CameraPlotElementHandlesProps) => {
  // Show rotation handles for cameras, persons, and furniture when selected
  const canRotate = element.type === 'camera' || element.type === 'person' || element.type === 'furniture';
  const showRotationHandle = isSelected && canRotate && onRotationStart;

  // Show scale handles for furniture when selected
  const canScale = element.type === 'furniture';
  const showScaleHandles = isSelected && canScale && onScaleStart;

  return (
    <>
      {showRotationHandle && (
        <CameraPlotRotationHandle
          onRotationStart={onRotationStart}
          isRotating={isRotating || false}
          elementRotation={element.rotation || 0}
        />
      )}
      
      {showScaleHandles && (
        <CameraPlotScaleHandles
          onScaleStart={onScaleStart}
          isScaling={isScaling || false}
        />
      )}
    </>
  );
};

export default CameraPlotElementHandles;
