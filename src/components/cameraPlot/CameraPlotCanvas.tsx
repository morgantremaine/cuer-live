
import React, { forwardRef, useState } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';
import CameraPlotElement from './CameraPlotElement';
import { useCameraPlotWallDrawing } from '@/hooks/cameraPlot/useCameraPlotWallDrawing';

interface CameraPlotCanvasProps {
  scene: CameraPlotScene | undefined;
  selectedTool: string;
  selectedElements: string[];
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
  showGrid,
  onAddElement,
  onUpdateElement,
  onDeleteElement,
  onSelectElement,
  snapToGrid
}, ref) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const {
    isDrawing: isDrawingWall,
    currentPath,
    previewPoint,
    startDrawing,
    addPoint,
    updatePreview,
    finishDrawing,
    cancelDrawing
  } = useCameraPlotWallDrawing();

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
    const snapped = snapToGrid(x, y);

    if (selectedTool === 'wall') {
      if (!isDrawingWall) {
        startDrawing(snapped);
      } else {
        addPoint(snapped);
      }
      return;
    }

    onAddElement(selectedTool, snapped.x, snapped.y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    const snappedPos = snapToGrid(rawPos.x, rawPos.y);
    setMousePos(snappedPos);

    if (isDrawingWall) {
      updatePreview(snappedPos);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (selectedTool === 'wall' && isDrawingWall) {
      const segments = finishDrawing();
      // Convert segments to wall elements
      segments.forEach((segment, index) => {
        const length = Math.sqrt(
          Math.pow(segment.end.x - segment.start.x, 2) + 
          Math.pow(segment.end.y - segment.start.y, 2)
        );
        const angle = Math.atan2(
          segment.end.y - segment.start.y, 
          segment.end.x - segment.start.x
        ) * (180 / Math.PI);
        
        const element: Partial<CameraElement> = {
          id: segment.id,
          type: 'wall',
          x: segment.start.x,
          y: segment.start.y - 2,
          width: length,
          height: 4,
          rotation: angle,
          scale: 1,
          label: '',
          labelOffsetX: 0,
          labelOffsetY: -20
        };
        
        if (scene) {
          const updatedElements = [...scene.elements, element as CameraElement];
          // This is a bit hacky, but we need to update the scene directly
          scene.elements = updatedElements;
        }
      });
    }
  };

  const renderGrid = () => {
    if (!showGrid) return null;
    
    const gridSize = 20;
    const lines = [];
    
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

  const currentPreviewPoint = previewPoint || mousePos;

  return (
    <div className="flex-1 relative overflow-auto bg-gray-600">
      <div
        ref={ref}
        className="relative bg-gray-600"
        onClick={handleCanvasClick}
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
        style={{ 
          width: '2000px', 
          height: '2000px',
          cursor: selectedTool === 'select' ? 'default' : 'crosshair'
        }}
      >
        {renderGrid()}

        {/* Wall drawing preview */}
        {isDrawingWall && currentPath.length > 0 && (
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
            {isDrawingWall && (
              <p className="text-xs mt-2 text-blue-400">
                Click to add wall points, double-click to finish
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

CameraPlotCanvas.displayName = 'CameraPlotCanvas';

export default CameraPlotCanvas;
