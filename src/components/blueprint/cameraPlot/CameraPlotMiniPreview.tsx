
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
                  x={x + width * 0.2}
                  y={y + height * 0.2}
                  width={width * 0.6}
                  height={height * 0.6}
                  fill="#3b82f6"
                  stroke="#1d4ed8"
                  strokeWidth="1"
                  rx="3"
                />
                <path
                  d={`M${x} ${y + height * 0.35} L${x + width * 0.2} ${y + height * 0.5} L${x} ${y + height * 0.65} Z`}
                  fill="#3b82f6"
                  stroke="#1d4ed8"
                  strokeWidth="1"
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
            return (
              <circle
                key={`${element.id}-${index}`}
                cx={x + width/2}
                cy={y + height/2}
                r={Math.max(8, Math.min(width, height)/2)}
                fill="#10b981"
                stroke="#059669"
                strokeWidth="1"
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
