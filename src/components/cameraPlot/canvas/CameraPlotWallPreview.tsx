
import React from 'react';

interface Point {
  x: number;
  y: number;
}

interface CameraPlotWallPreviewProps {
  isDrawingWall: boolean;
  currentPath: Point[];
  previewPoint: Point | null;
  mousePos: Point;
}

const CameraPlotWallPreview = ({
  isDrawingWall,
  currentPath,
  previewPoint,
  mousePos
}: CameraPlotWallPreviewProps) => {
  if (!isDrawingWall || currentPath.length === 0) return null;

  const currentPreviewPoint = previewPoint || mousePos;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-40"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Draw completed path segments */}
      {currentPath.map((point, index) => {
        if (index === 0) return null;
        const prevPoint = currentPath[index - 1];
        return (
          <line
            key={`path-${index}`}
            x1={prevPoint.x}
            y1={prevPoint.y}
            x2={point.x}
            y2={point.y}
            stroke="#60A5FA"
            strokeWidth="4"
            opacity={0.8}
          />
        );
      })}
      
      {/* Preview line to current mouse position */}
      {currentPath.length > 0 && (
        <line
          x1={currentPath[currentPath.length - 1].x}
          y1={currentPath[currentPath.length - 1].y}
          x2={currentPreviewPoint.x}
          y2={currentPreviewPoint.y}
          stroke="#60A5FA"
          strokeWidth="4"
          strokeDasharray="8,4"
          opacity={0.6}
        />
      )}
      
      {/* Draw points */}
      {currentPath.map((point, index) => (
        <circle
          key={`point-${index}`}
          cx={point.x}
          cy={point.y}
          r="6"
          fill="#ef4444"
          stroke="#fff"
          strokeWidth="2"
        />
      ))}
      
      {/* Preview point */}
      <circle
        cx={currentPreviewPoint.x}
        cy={currentPreviewPoint.y}
        r="4"
        fill="#60A5FA"
        opacity={0.8}
      />
    </svg>
  );
};

export default CameraPlotWallPreview;
