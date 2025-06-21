import React from 'react';
import { CameraElement } from '@/hooks/cameraPlot/core/useCameraPlotData';

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
  // Calculate bounds of all elements to determine how to scale and center them
  const calculateBounds = () => {
    if (elements.length === 0) {
      return { minX: 0, minY: 0, maxX: containerWidth, maxY: containerHeight };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elements.forEach(element => {
      const left = element.x;
      const right = element.x + element.width;
      const top = element.y;
      const bottom = element.y + element.height;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    });

    // Add padding around elements to show context
    const sceneWidth = maxX - minX;
    const sceneHeight = maxY - minY;
    const padding = Math.max(sceneWidth * 0.1, sceneHeight * 0.1, 20);
    
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding
    };
  };

  const bounds = calculateBounds();
  const sceneWidth = bounds.maxX - bounds.minX;
  const sceneHeight = bounds.maxY - bounds.minY;
  
  // Calculate scale to fit the scene in the preview container
  const scaleX = (containerWidth * 0.9) / sceneWidth;
  const scaleY = (containerHeight * 0.9) / sceneHeight;
  const scale = Math.min(scaleX, scaleY);

  // Calculate offset to center the scaled content
  const scaledWidth = sceneWidth * scale;
  const scaledHeight = sceneHeight * scale;
  const offsetX = (containerWidth - scaledWidth) / 2;
  const offsetY = (containerHeight - scaledHeight) / 2;

  const renderElement = (element: CameraElement) => {
    const x = (element.x - bounds.minX) * scale + offsetX;
    const y = (element.y - bounds.minY) * scale + offsetY;
    const width = Math.max(element.width * scale, 3);
    const height = Math.max(element.height * scale, 3);
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img 
              src="/lovable-uploads/18d85ba8-e104-4668-8abc-7ccc6eb22d88.png" 
              alt="Camera"
              style={{
                width: Math.max(width * 0.8, 4),
                height: Math.max(height * 0.8, 4),
                objectFit: 'contain'
              }}
            />
          </div>
        );
      
      case 'person':
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img 
              src="/lovable-uploads/64bd14bd-89fd-47d4-aec8-d162eca2c39b.png" 
              alt="Person"
              style={{
                width: Math.max(width * 0.8, 4),
                height: Math.max(height * 0.8, 4),
                objectFit: 'contain'
              }}
            />
          </div>
        );
      
      case 'wall':
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              backgroundColor: '#111827',
              borderRadius: '2px'
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
              border: `${Math.max(1, scale)}px solid #000000`
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
              border: `${Math.max(1, scale)}px solid #000000`
            }}
          />
        );
    }
  };

  return (
    <div 
      className="relative bg-gray-800 border border-gray-600 overflow-hidden"
      style={{ 
        width: containerWidth, 
        height: containerHeight,
        minHeight: '60px'
      }}
    >
      {elements.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          No elements
        </div>
      ) : (
        elements.map(renderElement)
      )}
    </div>
  );
};

export default CameraPlotMiniPreview;
