
import React, { forwardRef, useState } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';
import CameraPlotElement from './CameraPlotElement';

interface CameraPlotCanvasProps {
  scene: CameraPlotScene | undefined;
  selectedTool: string;
  selectedElements: string[];
  isDrawingWall?: boolean;
  wallStart?: { x: number; y: number } | null;
  showGrid?: boolean;
  onAddElement: (type: string, x: number, y: number) => void;
  onUpdateElement: (elementId: string, updates: Partial<CameraElement>) => void;
  onDeleteElement: (elementId: string) => void;
  onSelectElement: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

const CameraPlotCanvas = forwardRef<HTMLDivElement, CameraPlotCanvasProps>(({
  scene,
  selectedTool,
  selectedElements,
  isDrawingWall,
  wallStart,
  showGrid,
  onAddElement,
  onUpdateElement,
  onDeleteElement,
  onSelectElement,
  snapToGrid
}, ref) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (selectedTool === 'select') {
      if (e.target === e.currentTarget) {
        onSelectElement('', false);
      }
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onAddElement(selectedTool, x, y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    const snappedPos = snapToGrid(rawPos.x, rawPos.y);
    setMousePos(snappedPos);
  };

  const renderGrid = () => {
    if (!showGrid) return null;
    
    const gridSize = 20;
    const lines = [];
    
    // Vertical lines
    for (let x = 0; x <= 2000; x += gridSize) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={2000}
          stroke="#374151"
          strokeWidth={0.5}
          opacity={0.3}
        />
      );
    }
    
    // Horizontal lines
    for (let y = 0; y <= 2000; y += gridSize) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={2000}
          y2={y}
          stroke="#374151"
          strokeWidth={0.5}
          opacity={0.3}
        />
      );
    }
    
    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      >
        {lines}
      </svg>
    );
  };

  return (
    <div className="flex-1 relative overflow-auto bg-gray-600">
      <div
        ref={ref}
        className="relative bg-gray-600"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        style={{ 
          width: '2000px', 
          height: '2000px',
          cursor: selectedTool === 'select' ? 'default' : 'crosshair'
        }}
      >
        {/* Grid */}
        {renderGrid()}

        {/* Wall preview line */}
        {isDrawingWall && wallStart && (
          <svg
            className="absolute inset-0 pointer-events-none z-40"
            style={{ width: '100%', height: '100%' }}
          >
            <line
              x1={wallStart.x}
              y1={wallStart.y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#9CA3AF"
              strokeWidth="4"
              strokeDasharray="8,4"
            />
            {/* Start point indicator */}
            <circle
              cx={wallStart.x}
              cy={wallStart.y}
              r="4"
              fill="#ef4444"
            />
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
            snapToGrid={snapToGrid}
          />
        ))}

        {/* Empty state */}
        {!scene?.elements.length && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-300 text-center pointer-events-none">
            <p className="text-lg mb-2">Camera Plot Canvas</p>
            <p className="text-sm">Select a tool and click to add elements</p>
            <p className="text-xs mt-2 opacity-75">Grid snapping enabled (20px)</p>
          </div>
        )}
      </div>
    </div>
  );
});

CameraPlotCanvas.displayName = 'CameraPlotCanvas';

export default CameraPlotCanvas;
