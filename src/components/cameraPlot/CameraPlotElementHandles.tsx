
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
      {/* Selection outline that follows the actual shape */}
      {element.type === 'wall' && (
        <div 
          className="absolute inset-0 border-2 border-blue-500 border-opacity-75 pointer-events-none"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center'
          }}
        />
      )}

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
