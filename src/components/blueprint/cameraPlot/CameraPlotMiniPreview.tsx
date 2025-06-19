
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

    // Add some padding
    const padding = 20;
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
  const scaleX = containerWidth / sceneWidth;
  const scaleY = containerHeight / sceneHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1:1

  // Calculate offset to center the scaled content
  const scaledWidth = sceneWidth * scale;
  const scaledHeight = sceneHeight * scale;
  const offsetX = (containerWidth - scaledWidth) / 2;
  const offsetY = (containerHeight - scaledHeight) / 2;

  const renderElement = (element: CameraElement) => {
    const x = (element.x - bounds.minX) * scale + offsetX;
    const y = (element.y - bounds.minY) * scale + offsetY;
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
        width: containerWidth, 
        height: containerHeight,
        minHeight: '60px'
      }}
    >
      {elements.map(renderElement)}
    </div>
  );
};

export default CameraPlotMiniPreview;
