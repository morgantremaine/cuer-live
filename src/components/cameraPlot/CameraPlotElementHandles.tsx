
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
  isRotating = false
}: CameraPlotElementHandlesProps) => {
  if (!isSelected) return null;

  const canRotate = element.type === 'camera' || element.type === 'person';
  const canScale = element.type === 'furniture';

  return (
    <>
      {/* Rotation handle for cameras and people */}
      {canRotate && onRotationStart && (
        <CameraPlotRotationHandle 
          onRotationStart={onRotationStart}
          isRotating={isRotating}
        />
      )}
      
      {/* Scale handles for furniture only */}
      {canScale && (
        <>
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white cursor-nw-resize rounded-sm shadow-lg" />
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white cursor-ne-resize rounded-sm shadow-lg" />
          <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white cursor-sw-resize rounded-sm shadow-lg" />
          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white cursor-se-resize rounded-sm shadow-lg" />
        </>
      )}
    </>
  );
};

export default CameraPlotElementHandles;
