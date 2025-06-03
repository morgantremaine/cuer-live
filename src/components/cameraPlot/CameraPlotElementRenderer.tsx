
import React from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface CameraPlotElementRendererProps {
  element: CameraElement;
}

const CameraPlotElementRenderer = ({ element }: CameraPlotElementRendererProps) => {
  const scale = element.scale || 1;
  const rotation = element.rotation || 0;
  
  const style = {
    transform: `rotate(${rotation}deg) scale(${scale})`,
    transformOrigin: 'center'
  };

  switch (element.type) {
    case 'camera':
      return (
        <div 
          className="flex items-center justify-center border-2 border-blue-500 bg-white rounded-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center'
          }}
        >
          <svg viewBox="0 0 24 24" className="w-full h-full p-1">
            <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="white" strokeWidth="1"/>
            <line x1="12" y1="12" x2="18" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      );
    case 'person':
      return (
        <div 
          className="flex items-center justify-center border-2 border-green-500 bg-white rounded-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center'
          }}
        >
          <svg viewBox="0 0 24 24" className="w-full h-full p-1">
            <circle cx="12" cy="12" r="10" fill="#10b981" stroke="white" strokeWidth="1"/>
            <line x1="12" y1="12" x2="18" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      );
    case 'wall':
      return (
        <div 
          className="bg-gray-800 border border-gray-700"
          style={{ 
            width: '100%',
            height: '100%',
            transform: `rotate(${rotation}deg) scale(${scale})`
          }}
        />
      );
    case 'furniture':
      if (element.label.toLowerCase().includes('round') || element.label.toLowerCase().includes('circle')) {
        return (
          <div 
            className="rounded-full border-2 border-gray-400 bg-amber-100"
            style={style}
          />
        );
      }
      return (
        <div 
          className="border-2 border-gray-400 bg-amber-100"
          style={style}
        />
      );
    default:
      return (
        <div 
          className="border-2 border-gray-400 bg-gray-300"
          style={style}
        />
      );
  }
};

export default CameraPlotElementRenderer;
