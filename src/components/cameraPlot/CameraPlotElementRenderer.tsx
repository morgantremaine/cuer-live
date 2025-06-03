
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
          {/* Camera body (square) */}
          <div className="w-8 h-8 bg-blue-500 border-2 border-black relative z-10" />
          
          {/* Camera lens (triangle pointing towards square) */}
          <div 
            className="absolute w-0 h-0 z-0"
            style={{
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderRight: '10px solid #3b82f6',
              left: '-8px',
              top: '50%',
              transform: 'translateY(-50%)',
              filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))'
            }}
          />
          
          {/* Direction indicator - small line at the front */}
          <div 
            className="absolute w-1 h-2 bg-black z-20"
            style={{
              right: '-2px',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          />
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
