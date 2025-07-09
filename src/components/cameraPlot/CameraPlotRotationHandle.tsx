
import React from 'react';
import { RotateCw } from 'lucide-react';

interface CameraPlotRotationHandleProps {
  onRotationStart: (e: React.MouseEvent) => void;
  isRotating: boolean;
}

const CameraPlotRotationHandle = ({ onRotationStart, isRotating }: CameraPlotRotationHandleProps) => {
  return (
    <div
      className={`absolute -top-8 left-1/2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-pointer hover:bg-blue-600 transition-colors flex items-center justify-center ${
        isRotating ? 'bg-blue-600' : ''
      }`}
      style={{
        transform: 'translateX(-50%)', // Use CSS transform instead of Tailwind to prevent inheritance
        transformOrigin: 'center'
      }}
      onMouseDown={onRotationStart}
      title="Drag to rotate"
    >
      <RotateCw className="w-3 h-3 text-white" />
    </div>
  );
};

export default CameraPlotRotationHandle;
