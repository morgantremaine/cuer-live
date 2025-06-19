
import React from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface CameraPlotMiniPreviewProps {
  elements: CameraElement[];
  containerWidth?: number;
  containerHeight?: number;
}

const CameraPlotMiniPreview = ({ 
  elements, 
  containerWidth = 400, 
  containerHeight = 300 
}: CameraPlotMiniPreviewProps) => {
  const scale = 0.15; // Scale down elements for mini preview

  const renderElement = (element: CameraElement) => {
    const x = element.x * scale;
    const y = element.y * scale;
    const width = element.width * scale;
    const height = element.height * scale;
    const rotation = element.rotation || 0;

    const commonStyle = {
      position: 'absolute' as const,
      left: x,
      top: y,
      width,
      height,
      transform: `rotate(${rotation}deg)`,
      transformOrigin: 'center'
    };

    switch (element.type) {
      case 'camera':
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              backgroundColor: '#3b82f6',
              borderRadius: '2px'
            }}
          />
        );
      
      case 'person':
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              backgroundColor: '#10b981',
              borderRadius: '50%'
            }}
          />
        );
      
      case 'wall':
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              backgroundColor: '#374151',
              border: '1px solid #6b7280'
            }}
          />
        );
      
      case 'furniture':
        const isRound = element.label && (
          element.label.toLowerCase().includes('round') || 
          element.label.toLowerCase().includes('circle')
        );
        
        // Use the element's color or default to gray
        const furnitureColor = element.color || '#6b7280';
        
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              backgroundColor: furnitureColor,
              borderRadius: isRound ? '50%' : '0',
              border: '1px solid #000000'
            }}
          />
        );
      
      default:
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              backgroundColor: '#6b7280',
              border: '1px solid #000000'
            }}
          />
        );
    }
  };

  return (
    <div 
      className="relative bg-gray-100 border border-gray-300 overflow-hidden"
      style={{ 
        width: containerWidth * scale, 
        height: containerHeight * scale,
        minHeight: '60px'
      }}
    >
      {elements.map(renderElement)}
    </div>
  );
};

export default CameraPlotMiniPreview;
