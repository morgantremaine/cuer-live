
import React from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';
import { User } from 'lucide-react';

interface CameraPlotElementRendererProps {
  element: CameraElement;
}

const CameraPlotElementRenderer = ({ element }: CameraPlotElementRendererProps) => {
  const rotation = element.rotation || 0;
  const scale = element.scale || 1;
  
  const baseStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  switch (element.type) {
    case 'camera':
      return (
        <div 
          className="relative"
          style={{
            ...baseStyle,
            transform: `rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: 'center'
          }}
        >
          {/* Top-down camera view: square body with triangular lens pointing left */}
          <svg width="40" height="32" viewBox="0 0 40 32" className="fill-blue-500 stroke-black stroke-1">
            {/* Camera body - square on the right */}
            <rect x="20" y="8" width="16" height="16" rx="2" ry="2" />
            {/* Camera lens - triangle pointing left from the body */}
            <path d="M20 8 L4 16 L20 24 Z" />
          </svg>
        </div>
      );
      
    case 'person':
      return (
        <div 
          className="bg-green-500 border-2 border-black rounded-full flex items-center justify-center relative"
          style={{
            ...baseStyle,
            transform: `rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: 'center'
          }}
        >
          <User className="w-6 h-6 text-black" />
          {/* Direction indicator */}
          <div 
            className="absolute w-0 h-0 border-l-2 border-r-2 border-b-4 border-transparent border-b-black"
            style={{
              top: '-4px',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          />
        </div>
      );
      
    case 'wall':
      return (
        <div 
          className="bg-gray-800 border border-gray-600"
          style={{
            transform: `rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: 'center',
            width: '100%',
            height: '100%'
          }}
        />
      );
      
    case 'furniture':
      const isRound = element.label.toLowerCase().includes('round') || element.label.toLowerCase().includes('circle');
      
      if (isRound) {
        return (
          <div 
            className="bg-amber-500 border-2 border-black rounded-full"
            style={{
              transform: `rotate(${rotation}deg) scale(${scale})`,
              transformOrigin: 'center',
              width: '100%',
              height: '100%'
            }}
          />
        );
      }
      
      return (
        <div 
          className="bg-amber-500 border-2 border-black"
          style={{
            transform: `rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: 'center',
            width: '100%',
            height: '100%'
          }}
        />
      );
      
    default:
      return (
        <div 
          className="bg-gray-500 border-2 border-black"
          style={{
            transform: `rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: 'center',
            width: '100%',
            height: '100%'
          }}
        />
      );
  }
};

export default CameraPlotElementRenderer;
