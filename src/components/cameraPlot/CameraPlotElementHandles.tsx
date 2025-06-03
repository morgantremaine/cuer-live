
import React from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface CameraPlotElementHandlesProps {
  element: CameraElement;
  isSelected: boolean;
  isInRotationZone?: boolean;
  isInScaleZone?: boolean;
}

const CameraPlotElementHandles = ({ 
  element, 
  isSelected, 
  isInRotationZone, 
  isInScaleZone 
}: CameraPlotElementHandlesProps) => {
  if (!isSelected) return null;

  const canRotate = element.type === 'camera' || element.type === 'person';
  const canScale = element.type === 'furniture';

  return (
    <>
      {/* Rotation zone indicator for cameras and people */}
      {canRotate && (
        <div 
          className="absolute border-2 border-dashed border-blue-400 rounded-full pointer-events-none"
          style={{
            left: '-25px',
            top: '-25px',
            right: '-25px',
            bottom: '-25px',
            opacity: isInRotationZone ? 0.8 : 0.2
          }}
        />
      )}
      
      {/* Scale handles for furniture only */}
      {canScale && (
        <>
          <div 
            className={`absolute -top-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white cursor-nw-resize rounded-sm shadow-lg transition-opacity ${
              isInScaleZone ? 'opacity-100' : 'opacity-60'
            }`} 
          />
          <div 
            className={`absolute -top-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white cursor-ne-resize rounded-sm shadow-lg transition-opacity ${
              isInScaleZone ? 'opacity-100' : 'opacity-60'
            }`} 
          />
          <div 
            className={`absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white cursor-sw-resize rounded-sm shadow-lg transition-opacity ${
              isInScaleZone ? 'opacity-100' : 'opacity-60'
            }`} 
          />
          <div 
            className={`absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white cursor-se-resize rounded-sm shadow-lg transition-opacity ${
              isInScaleZone ? 'opacity-100' : 'opacity-60'
            }`} 
          />
        </>
      )}
      
      {/* Selection outline */}
      <div 
        className="absolute inset-0 border-2 border-blue-500 rounded pointer-events-none"
        style={{ opacity: 0.6 }}
      />
    </>
  );
};

export default CameraPlotElementHandles;
