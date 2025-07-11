import React from 'react';
import { WallPoint } from '@/hooks/cameraPlot/wallDrawing/useSimpleWallDrawing';

interface SimpleWallDrawingOverlayProps {
  isDrawing: boolean;
  wallPoints: WallPoint[];
  previewPoint: WallPoint | null;
}

const SimpleWallDrawingOverlay = ({
  isDrawing,
  wallPoints,
  previewPoint
}: SimpleWallDrawingOverlayProps) => {
  if (!isDrawing) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1000 }}
    >
      {/* Draw completed wall segments */}
      {wallPoints.map((point, index) => {
        if (index === 0) return null;
        const prevPoint = wallPoints[index - 1];
        
        return (
          <line
            key={`wall-${index}`}
            x1={prevPoint.x}
            y1={prevPoint.y}
            x2={point.x}
            y2={point.y}
            stroke="hsl(var(--primary))"
            strokeWidth="4"
            strokeLinecap="round"
          />
        );
      })}
      
      {/* Draw preview line */}
      {previewPoint && wallPoints.length > 0 && (
        <line
          x1={wallPoints[wallPoints.length - 1].x}
          y1={wallPoints[wallPoints.length - 1].y}
          x2={previewPoint.x}
          y2={previewPoint.y}
          stroke="hsl(var(--primary) / 0.5)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="5,5"
        />
      )}
      
      {/* Draw wall points */}
      {wallPoints.map((point, index) => (
        <circle
          key={`point-${index}`}
          cx={point.x}
          cy={point.y}
          r="4"
          fill="hsl(var(--primary))"
          stroke="hsl(var(--background))"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
};

export default SimpleWallDrawingOverlay;