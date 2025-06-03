
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

  const rotation = element.rotation || 0;

  return (
    <>
      {/* Selection outline that follows the actual shape and rotation */}
      <div 
        className="absolute border-2 border-blue-500 border-opacity-75 pointer-events-none"
        style={{
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center'
        }}
      />

      {/* Rotation handle for rotatable elements */}
      {onRotationStart && (
        <CameraPlotRotationHandle
          onRotationStart={onRotationStart}
          isRotating={isRotating}
        />
      )}
    </>
  );
};

export default CameraPlotElementHandles;
