import React from 'react';
import { WallSystem } from '@/hooks/cameraPlot/wallSystem/types';

interface WallDrawingPreviewProps {
  isDrawing: boolean;
  currentPath: string[];
  previewPoint: { x: number; y: number } | null;
  wallSystem: WallSystem;
  scale?: number;
}

const WallDrawingPreview: React.FC<WallDrawingPreviewProps> = ({
  isDrawing,
  currentPath,
  previewPoint,
  wallSystem,
  scale = 1
}) => {
  if (!isDrawing || currentPath.length === 0 || !previewPoint) return null;

  // Get the last node in the current path
  const lastNodeId = currentPath[currentPath.length - 1];
  const lastNode = wallSystem.nodes.find(n => n.id === lastNodeId);
  
  if (!lastNode) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%', zIndex: 35 }}
    >
      {/* Preview line from last node to mouse position */}
      <line
        x1={lastNode.x}
        y1={lastNode.y}
        x2={previewPoint.x}
        y2={previewPoint.y}
        stroke="hsl(var(--primary))"
        strokeWidth={4 * scale}
        strokeDasharray="8,4"
        strokeLinecap="round"
        opacity={0.7}
      />
      
      {/* Preview point at mouse position */}
      <circle
        cx={previewPoint.x}
        cy={previewPoint.y}
        r={4 * scale}
        fill="hsl(var(--primary))"
        opacity={0.8}
      />
    </svg>
  );
};

export default WallDrawingPreview;