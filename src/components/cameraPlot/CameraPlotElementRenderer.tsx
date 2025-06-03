
import React from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface CameraPlotElementRendererProps {
  element: CameraElement;
}

const CameraPlotElementRenderer = ({ element }: CameraPlotElementRendererProps) => {
  const rotation = element.rotation || 0;
  const scale = element.scale || 1;
  
  const style = {
    transform: `rotate(${rotation}deg) scale(${scale})`,
    transformOrigin: 'center',
    width: '100%',
    height: '100%'
  };

  switch (element.type) {
    case 'camera':
      return (
        <div 
          className="flex items-center justify-center bg-blue-600 border-2 border-black rounded"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center'
          }}
        >
          <svg viewBox="0 0 24 24" className="w-3/4 h-3/4">
            {/* Camera body */}
            <rect x="4" y="8" width="16" height="10" fill="black" rx="1"/>
            {/* Lens */}
            <circle cx="12" cy="13" r="3" fill="white"/>
            <circle cx="12" cy="13" r="1.5" fill="black"/>
            {/* Direction indicator */}
            <line x1="12" y1="13" x2="12" y2="6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
            <polygon points="12,6 10,8 14,8" fill="black"/>
          </svg>
        </div>
      );
      
    case 'person':
      return (
        <div 
          className="flex items-center justify-center bg-green-600 border-2 border-black rounded-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center'
          }}
        >
          <svg viewBox="0 0 24 24" className="w-3/4 h-3/4">
            {/* Head */}
            <circle cx="12" cy="8" r="3" fill="black"/>
            {/* Body */}
            <ellipse cx="12" cy="16" rx="4" ry="6" fill="black"/>
            {/* Direction indicator */}
            <line x1="12" y1="8" x2="12" y2="2" stroke="black" strokeWidth="2" strokeLinecap="round"/>
            <polygon points="12,2 10,4 14,4" fill="black"/>
          </svg>
        </div>
      );
      
    case 'wall':
      return (
        <div 
          className="bg-gray-800 border border-gray-600"
          style={style}
        />
      );
      
    case 'furniture':
      const isRound = element.label.toLowerCase().includes('round') || element.label.toLowerCase().includes('circle');
      
      if (isRound) {
        return (
          <div 
            className="bg-amber-200 border-2 border-gray-700 rounded-full"
            style={style}
          />
        );
      }
      
      return (
        <div 
          className="bg-amber-200 border-2 border-gray-700"
          style={style}
        />
      );
      
    default:
      return (
        <div 
          className="bg-gray-300 border-2 border-gray-600"
          style={style}
        />
      );
  }
};

export default CameraPlotElementRenderer;
