
import React, { forwardRef, useState } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';
import CameraPlotElement from './CameraPlotElement';

interface CameraPlotCanvasProps {
  scene: CameraPlotScene | undefined;
  selectedTool: string;
  selectedElements: string[];
  isDrawingWall?: boolean;
  wallPoints?: { x: number; y: number }[];
  onAddElement: (type: string, x: number, y: number) => void;
  onUpdateElement: (elementId: string, updates: Partial<CameraElement>) => void;
  onDeleteElement: (elementId: string) => void;
  onSelectElement: (elementId: string, multiSelect?: boolean) => void;
}

const CameraPlotCanvas = forwardRef<HTMLDivElement, CameraPlotCanvasProps>(({
  scene,
  selectedTool,
  selectedElements,
  isDrawingWall,
  wallPoints,
  onAddElement,
  onUpdateElement,
  onDeleteElement,
  onSelectElement
}, ref) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (selectedTool === 'select') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onAddElement(selectedTool, x, y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (selectedTool === 'select' && e.target === e.currentTarget) {
      onSelectElement('', false); // Clear selection when clicking empty space
    }
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-gray-600">
      <div
        ref={ref}
        className="w-full h-full relative cursor-crosshair bg-gray-600"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleCanvasMouseDown}
        style={{ minHeight: '100vh' }}
      >
        {/* Wall preview lines */}
        {isDrawingWall && wallPoints && wallPoints.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none z-50"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Draw existing wall segments */}
            {wallPoints.length > 1 && wallPoints.map((point, index) => {
              if (index === 0) return null;
              const prevPoint = wallPoints[index - 1];
              return (
                <line
                  key={`wall-${index}`}
                  x1={prevPoint.x}
                  y1={prevPoint.y}
                  x2={point.x}
                  y2={point.y}
                  stroke="#374151"
                  strokeWidth="4"
                />
              );
            })}
            {/* Draw preview line from last point to mouse */}
            {wallPoints.length > 0 && (
              <line
                x1={wallPoints[wallPoints.length - 1].x}
                y1={wallPoints[wallPoints.length - 1].y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#9CA3AF"
                strokeWidth="4"
                strokeDasharray="8,4"
              />
            )}
          </svg>
        )}

        {/* Render all elements */}
        {scene?.elements.map((element) => (
          <CameraPlotElement
            key={element.id}
            element={element}
            isSelected={selectedElements.includes(element.id)}
            onUpdate={onUpdateElement}
            onDelete={onDeleteElement}
            onSelect={onSelectElement}
          />
        ))}

        {/* Empty state */}
        {!scene?.elements.length && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <div className="text-center">
              <p className="text-lg mb-2">Camera Plot Canvas</p>
              <p className="text-sm">Select a tool and click to add elements</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

CameraPlotCanvas.displayName = 'CameraPlotCanvas';

export default CameraPlotCanvas;
