
import React from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface CameraPlotElementHandlesProps {
  element: CameraElement;
  isSelected: boolean;
  cursorMode?: 'normal' | 'rotate' | 'scale';
}

const CameraPlotElementHandles = ({ element, isSelected, cursorMode }: CameraPlotElementHandlesProps) => {
  if (!isSelected) return null;

  const canTransform = element.type === 'furniture';
  const canRotate = element.type === 'camera' || element.type === 'person' || element.type === 'furniture';

  return (
    <>
      {/* Rotation zone indicator */}
      {canRotate && (
        <div 
          className="absolute border-2 border-dashed border-blue-400 rounded-full pointer-events-none"
          style={{
            left: '-15px',
            top: '-15px',
            right: '-15px',
            bottom: '-15px',
            opacity: cursorMode === 'rotate' ? 0.8 : 0.3
          }}
        />
      )}
      
      {/* Scale handles for furniture only */}
      {canTransform && (
        <>
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 border border-white cursor-nw-resize rounded" />
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 border border-white cursor-ne-resize rounded" />
          <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 border border-white cursor-sw-resize rounded" />
          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border border-white cursor-se-resize rounded" />
        </>
      )}
    </>
  );
};

export default CameraPlotElementHandles;
