
import React from 'react';
import { Maximize2 } from 'lucide-react';

interface CameraPlotScaleHandlesProps {
  onScaleStart: (e: React.MouseEvent) => void;
  isScaling: boolean;
}

const CameraPlotScaleHandles = ({ onScaleStart, isScaling }: CameraPlotScaleHandlesProps) => {
  const handleStyle = `absolute w-3 h-3 bg-blue-500 border border-white shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center ${
    isScaling ? 'bg-blue-600' : ''
  }`;

  return (
    <>
      {/* Top-left corner */}
      <div
        className={`${handleStyle} cursor-nw-resize -top-1.5 -left-1.5`}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="nw"
      />
      
      {/* Top-right corner */}
      <div
        className={`${handleStyle} cursor-ne-resize -top-1.5 -right-1.5`}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="ne"
      />
      
      {/* Bottom-left corner */}
      <div
        className={`${handleStyle} cursor-sw-resize -bottom-1.5 -left-1.5`}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="sw"
      />
      
      {/* Bottom-right corner */}
      <div
        className={`${handleStyle} cursor-se-resize -bottom-1.5 -right-1.5`}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="se"
      />
      
      {/* Top center */}
      <div
        className={`${handleStyle} cursor-n-resize -top-1.5 left-1/2 transform -translate-x-1/2`}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="n"
      />
      
      {/* Bottom center */}
      <div
        className={`${handleStyle} cursor-s-resize -bottom-1.5 left-1/2 transform -translate-x-1/2`}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="s"
      />
      
      {/* Left center */}
      <div
        className={`${handleStyle} cursor-w-resize -left-1.5 top-1/2 transform -translate-y-1/2`}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="w"
      />
      
      {/* Right center */}
      <div
        className={`${handleStyle} cursor-e-resize -right-1.5 top-1/2 transform -translate-y-1/2`}
        onMouseDown={onScaleStart}
        title="Drag to resize"
        data-handle="e"
      />
    </>
  );
};

export default CameraPlotScaleHandles;
