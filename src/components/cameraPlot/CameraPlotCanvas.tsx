
import React, { forwardRef, useState } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';
import CameraPlotElement from './CameraPlotElement';

interface CameraPlotCanvasProps {
  scene: CameraPlotScene | undefined;
  selectedTool: string;
  selectedElements: string[];
  isDrawingWall?: boolean;
  wallStart?: { x: number; y: number } | null;
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
  wallStart,
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
    <div className="flex-1 relative overflow-hidden bg-gray-700">
      <div
        ref={ref}
        className="w-full h-full relative cursor-crosshair bg-gray-700"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleCanvasMouseDown}
        style={{ minHeight: '100vh' }}
      >
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

        {/* Show wall preview while drawing */}
        {isDrawingWall && wallStart && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
          >
            <line
              x1={wallStart.x}
              y1={wallStart.y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#9CA3AF"
              strokeWidth="3"
              strokeDasharray="5,5"
            />
          </svg>
        )}

        {/* Empty state */}
        {!scene?.elements.length && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
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
