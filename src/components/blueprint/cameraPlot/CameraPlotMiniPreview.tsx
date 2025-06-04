
import React from 'react';
import { CameraPlotScene } from '@/hooks/cameraPlot/core/useCameraPlotData';

interface CameraPlotMiniPreviewProps {
  plot: CameraPlotScene;
}

const CameraPlotMiniPreview = ({ plot }: CameraPlotMiniPreviewProps) => {
  const calculateBounds = (elements: any[]) => {
    if (!elements || elements.length === 0) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    elements.forEach((element: any) => {
      const elementMinX = element.x;
      const elementMinY = element.y;
      const elementMaxX = element.x + element.width;
      const elementMaxY = element.y + element.height;

      minX = Math.min(minX, elementMinX);
      minY = Math.min(minY, elementMinY);
      maxX = Math.max(maxX, elementMaxX);
      maxY = Math.max(maxY, elementMaxY);
    });

    const padding = 20;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding
    };
  };

  if (!plot.elements || plot.elements.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs bg-gray-600">
        Empty Scene
      </div>
    );
  }

  const bounds = calculateBounds(plot.elements);
  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;
  const viewBoxWidth = Math.max(contentWidth, 100);
  const viewBoxHeight = Math.max(contentHeight, 100);

  return (
    <div className="absolute inset-0 bg-gray-600">
      <svg 
        className="w-full h-full" 
        viewBox={`${bounds.minX} ${bounds.minY} ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        key={`preview-${plot.id}-${plot.elements.length}`}
      >
        {plot.elements.map((element: any, index: number) => {
          const x = element.x;
          const y = element.y;
          const width = element.width;
          const height = element.height;

          if (element.type === 'camera') {
            return (
              <g key={`${element.id}-${index}`}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill="#1e40af"
                  stroke="#1d4ed8"
                  strokeWidth="1"
                  rx="3"
                  transform={`rotate(${element.rotation || 0} ${x + width/2} ${y + height/2})`}
                />
                <image
                  href="/lovable-uploads/18d85ba8-e104-4668-8abc-7ccc6eb22d88.png"
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  preserveAspectRatio="xMidYMid meet"
                  transform={`rotate(${element.rotation || 0} ${x + width/2} ${y + height/2})`}
                />
              </g>
            );
          } else if (element.type === 'wall') {
            return (
              <rect
                key={`${element.id}-${index}`}
                x={x}
                y={y}
                width={width}
                height={height}
                fill="#374151"
                transform={`rotate(${element.rotation || 0} ${x + width/2} ${y + height/2})`}
              />
            );
          } else if (element.type === 'person') {
            // Make person icons larger and use new uploaded image without triangle background
            const personSize = Math.max(width, height) * 1.5; // 50% larger
            const personX = x + (width - personSize) / 2;
            const personY = y + (height - personSize) / 2;
            
            return (
              <image
                key={`${element.id}-${index}`}
                href="/lovable-uploads/53aede73-ec59-4307-8be5-74cb3cf7b36c.png"
                x={personX}
                y={personY}
                width={personSize}
                height={personSize}
                preserveAspectRatio="xMidYMid meet"
                transform={`rotate(${element.rotation || 0} ${x + width/2} ${y + height/2})`}
              />
            );
          } else if (element.type === 'furniture') {
            const isRound = element.label?.toLowerCase().includes('round') || element.label?.toLowerCase().includes('circle');
            
            if (isRound) {
              return (
                <circle
                  key={`${element.id}-${index}`}
                  cx={x + width/2}
                  cy={y + height/2}
                  r={Math.min(width, height)/2}
                  fill="#f59e0b"
                  stroke="#d97706"
                  strokeWidth="1"
                />
              );
            }
            
            return (
              <rect
                key={`${element.id}-${index}`}
                x={x}
                y={y}
                width={width}
                height={height}
                fill="#f59e0b"
                stroke="#d97706"
                strokeWidth="1"
                rx="2"
              />
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
};

export default CameraPlotMiniPreview;
