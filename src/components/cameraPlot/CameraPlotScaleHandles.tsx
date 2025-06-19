
import React from 'react';

interface CameraPlotScaleHandlesProps {
  onScaleStart: (e: React.MouseEvent) => void;
  isScaling: boolean;
}

const CameraPlotScaleHandles = ({ onScaleStart, isScaling }: CameraPlotScaleHandlesProps) => {
  const handleStyle = `absolute w-3 h-3 bg-blue-500 border border-white shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center z-20 ${
    isScaling ? 'bg-blue-600' : ''
  }`;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Corner handles - these now properly inherit rotation */}
      <div
        className={`${handleStyle} cursor-nw-resize pointer-events-auto`}
        style={{ 
          top: '-6px', 
          left: '-6px',
          transformOrigin: 'center'
        }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="nw"
      />
      
      <div
        className={`${handleStyle} cursor-ne-resize pointer-events-auto`}
        style={{ 
          top: '-6px', 
          right: '-6px',
          transformOrigin: 'center'
        }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="ne"
      />
      
      <div
        className={`${handleStyle} cursor-sw-resize pointer-events-auto`}
        style={{ 
          bottom: '-6px', 
          left: '-6px',
          transformOrigin: 'center'
        }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="sw"
      />
      
      <div
        className={`${handleStyle} cursor-se-resize pointer-events-auto`}
        style={{ 
          bottom: '-6px', 
          right: '-6px',
          transformOrigin: 'center'
        }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="se"
      />
      
      {/* Edge handles - these also properly inherit rotation */}
      <div
        className={`${handleStyle} cursor-n-resize pointer-events-auto`}
        style={{ 
          top: '-6px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          transformOrigin: 'center'
        }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="n"
      />
      
      <div
        className={`${handleStyle} cursor-s-resize pointer-events-auto`}
        style={{ 
          bottom: '-6px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          transformOrigin: 'center'
        }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="s"
      />
      
      <div
        className={`${handleStyle} cursor-w-resize pointer-events-auto`}
        style={{ 
          left: '-6px', 
          top: '50%', 
          transform: 'translateY(-50%)',
          transformOrigin: 'center'
        }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="w"
      />
      
      <div
        className={`${handleStyle} cursor-e-resize pointer-events-auto`}
        style={{ 
          right: '-6px', 
          top: '50%', 
          transform: 'translateY(-50%)',
          transformOrigin: 'center'
        }}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="e"
      />
    </div>
  );
};

export default CameraPlotScaleHandles;
