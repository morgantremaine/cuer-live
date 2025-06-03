
import React from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';
import CameraPlotRotationHandle from './CameraPlotRotationHandle';

interface CameraPlotElementHandlesProps {
  element: CameraElement;
  isSelected: boolean;
  onRotationStart?: (e: React.MouseEvent) => void;
  isRotating?: boolean;
}

const CameraPlotElementHandles = ({ 
  element, 
  isSelected, 
  onRotationStart,
  isRotating 
}: CameraPlotElementHandlesProps) => {
  // Only show rotation handles for cameras and persons when selected
  const canRotate = element.type === 'camera' || element.type === 'person';
  const showRotationHandle = isSelected && canRotate && onRotationStart;

  if (!showRotationHandle) {
    return null;
  }

  return (
    <CameraPlotRotationHandle
      onRotationStart={onRotationStart}
      isRotating={isRotating || false}
    />
  );
};

export default CameraPlotElementHandles;
