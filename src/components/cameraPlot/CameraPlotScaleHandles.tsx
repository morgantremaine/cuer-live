
import React from 'react';

interface CameraPlotScaleHandlesProps {
  onScaleStart: (e: React.MouseEvent) => void;
  isScaling: boolean;
}

const CameraPlotScaleHandles = ({ onScaleStart, isScaling }: CameraPlotScaleHandlesProps) => {
  const handleStyle = `absolute w-3 h-3 bg-blue-500 border border-white shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center z-20 ${
    isScaling ? 'bg-blue-600' : ''
  }`;

  // Style for handles that inherit the element's rotation
  const rotatedHandleStyle = `${handleStyle} transform-gpu`;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ transform: 'inherit' }}>
      {/* Corner handles - these move with rotation */}
      <div
        className={`${rotatedHandleStyle} cursor-nw-resize pointer-events-auto`}
        style={{ top: '-6px', left: '-6px' }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="nw"
      />
      
      <div
        className={`${rotatedHandleStyle} cursor-ne-resize pointer-events-auto`}
        style={{ top: '-6px', right: '-6px' }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="ne"
      />
      
      <div
        className={`${rotatedHandleStyle} cursor-sw-resize pointer-events-auto`}
        style={{ bottom: '-6px', left: '-6px' }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="sw"
      />
      
      <div
        className={`${rotatedHandleStyle} cursor-se-resize pointer-events-auto`}
        style={{ bottom: '-6px', right: '-6px' }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="se"
      />
      
      {/* Edge handles - these also move with rotation */}
      <div
        className={`${rotatedHandleStyle} cursor-n-resize pointer-events-auto`}
        style={{ top: '-6px', left: '50%', transform: 'translateX(-50%)' }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="n"
      />
      
      <div
        className={`${rotatedHandleStyle} cursor-s-resize pointer-events-auto`}
        style={{ bottom: '-6px', left: '50%', transform: 'translateX(-50%)' }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="s"
      />
      
      <div
        className={`${rotatedHandleStyle} cursor-w-resize pointer-events-auto`}
        style={{ left: '-6px', top: '50%', transform: 'translateY(-50%)' }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="w"
      />
      
      <div
        className={`${rotatedHandleStyle} cursor-e-resize pointer-events-auto`}
        style={{ right: '-6px', top: '50%', transform: 'translateY(-50%)' }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="e"
      />
    </div>
  );
};

export default CameraPlotScaleHandles;
