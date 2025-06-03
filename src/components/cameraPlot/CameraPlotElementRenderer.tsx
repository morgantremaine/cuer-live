
import React from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

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
          <img 
            src="/lovable-uploads/18d85ba8-e104-4668-8abc-7ccc6eb22d88.png" 
            alt="Camera"
            className="w-8 h-8 object-contain"
          />
        </div>
      );
      
    case 'person':
      return (
        <div 
          className="relative"
          style={{
            ...baseStyle,
            transform: `rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: 'center'
          }}
        >
          <img 
            src="/lovable-uploads/be690b28-e601-4ee1-9b5a-c96e6d6adb5a.png" 
            alt="Person"
            className="w-8 h-8 object-contain"
          />
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
