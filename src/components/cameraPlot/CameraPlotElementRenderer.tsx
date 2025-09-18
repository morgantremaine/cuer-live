
import React from 'react';
import { CameraElement } from '@/hooks/cameraPlot/core/useCameraPlotData';

interface CameraPlotElementRendererProps {
  element: CameraElement;
}

const CameraPlotElementRenderer = ({ element }: CameraPlotElementRendererProps) => {
  const scale = element.scale || 1;
  
  const baseStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: `scale(${scale})`,
    transformOrigin: 'center'
  };

  switch (element.type) {
    case 'camera':
      return (
        <div 
          className="relative"
          style={baseStyle}
        >
          <img 
            src="/uploads/18d85ba8-e104-4668-8abc-7ccc6eb22d88.png" 
            alt="Camera"
            className="w-8 h-8 object-contain"
          />
        </div>
      );
      
    case 'person':
      const personColor = element.personColor || 'blue';
      const personImages = {
        blue: "/uploads/64bd14bd-89fd-47d4-aec8-d162eca2c39b.png",
        green: "/uploads/camera-dot-green.png",
        red: "/uploads/camera-dot-red.png",
        yellow: "/uploads/camera-dot-yellow.png"
      };
      
      return (
        <div 
          className="relative"
          style={baseStyle}
        >
          <img 
            src={personImages[personColor]} 
            alt={`Person (${personColor})`}
            className="w-12 h-12 object-contain"
          />
        </div>
      );
      
    case 'wall':
      return (
        <div 
          className="bg-gray-900 rounded-sm"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            width: '100%',
            height: '100%'
          }}
        />
      );
      
    case 'furniture':
      const isRound = element.label && (
        element.label.toLowerCase().includes('round') || 
        element.label.toLowerCase().includes('circle')
      );
      
      // Use the element's color or default to gray
      const furnitureColor = element.color || '#6b7280'; // gray-500
      
      if (isRound) {
        return (
          <div 
            className="border-2 border-black rounded-full"
            style={{
              ...baseStyle,
              backgroundColor: furnitureColor
            }}
          />
        );
      }
      
      return (
        <div 
          className="border-2 border-black"
          style={{
            ...baseStyle,
            backgroundColor: furnitureColor
          }}
        />
      );
      
    default:
      return (
        <div 
          className="bg-gray-500 border-2 border-black"
          style={baseStyle}
        />
      );
  }
};

export default CameraPlotElementRenderer;
