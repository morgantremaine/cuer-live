
import React from 'react';
import { Maximize2 } from 'lucide-react';

interface CameraPlotScaleHandlesProps {
  onScaleStart: (e: React.MouseEvent) => void;
  isScaling: boolean;
}

const CameraPlotScaleHandles = ({ onScaleStart, isScaling }: CameraPlotScaleHandlesProps) => {
  return (
    <>
      {/* Bottom-right corner handle */}
      <div
        className={`absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-sm border-2 border-white shadow-lg cursor-se-resize hover:bg-blue-600 transition-colors flex items-center justify-center ${
          isScaling ? 'bg-blue-600' : ''
        }`}
        onMouseDown={onScaleStart}
        title="Drag to resize"
      >
        <Maximize2 className="w-2 h-2 text-white" />
      </div>
    </>
  );
};

export default CameraPlotScaleHandles;
