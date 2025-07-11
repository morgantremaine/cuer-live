
import React, { forwardRef, useEffect } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';
import CameraPlotElement from './CameraPlotElement';
import CameraPlotGrid from './canvas/CameraPlotGrid';
import CameraPlotEmptyState from './canvas/CameraPlotEmptyState';
import { useCameraPlotCanvasUnified } from '@/hooks/cameraPlot/canvas/useCameraPlotCanvasUnified';

interface CameraPlotCanvasProps {
  scene: CameraPlotScene | undefined;
  selectedTool: string;
  selectedElements: string[];
  showGrid?: boolean;
  zoom: number;
  pan: { x: number; y: number };
  updatePan: (deltaX: number, deltaY: number) => void;
  onAddElement: (type: string, x: number, y: number) => void;
  onUpdateElement: (elementId: string, updates: Partial<CameraElement>) => void;
  onDeleteElement: (elementId: string) => void;
  onDuplicateElement?: (elementId: string) => void;
  onSelectElement: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  updatePlot: (plotId: string, updatedPlot: Partial<CameraPlotScene>) => void;
  setSelectedTool: (tool: string) => void;
  // Wall drawing props
  isDrawingWall: boolean;
  wallStart: { x: number; y: number } | null;
  wallPreview: { x: number; y: number } | null;
  startWallDrawing: (point: { x: number; y: number }) => void;
  updateWallPreview: (point: { x: number; y: number }) => void;
  completeWall: (finalPoint?: { x: number; y: number }) => void;
}

const CameraPlotCanvas = forwardRef<HTMLDivElement, CameraPlotCanvasProps>(({
  scene,
  selectedTool,
  selectedElements,
  showGrid,
  zoom,
  pan,
  updatePan,
  onAddElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onSelectElement,
  snapToGrid,
  updatePlot,
  setSelectedTool,
  isDrawingWall,
  wallStart,
  wallPreview,
  startWallDrawing,
  updateWallPreview,
  completeWall
}, ref) => {
  // Unified canvas handlers - no conflicts
  const {
    mousePos,
    handleCanvasClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    isRightClickPanning
  } = useCameraPlotCanvasUnified({
    selectedTool,
    onAddElement,
    onSelectElement,
    snapToGrid,
    scene,
    onUpdateElement,
    zoom,
    pan,
    updatePan,
    isDrawingWall,
    startWallDrawing,
    updateWallPreview,
    completeWall
  });

  // Add keyboard event listener for delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        selectedElements.forEach(elementId => {
          onDeleteElement(elementId);
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElements, onDeleteElement]);

  return (
    <div className="flex-1 relative overflow-auto bg-gray-600">
      <div
        ref={ref}
        className="relative bg-gray-600"
        data-canvas="true"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right click
        style={{ 
          width: '1200px', 
          height: '800px',
          cursor: selectedTool === 'select' ? 
            (isRightClickPanning ? 'grabbing' : 'default') : 
            'crosshair',
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: '0 0'
        }}
        tabIndex={0}
      >
        

        {/* Simple Wall Drawing Preview - unified system */}
        {isDrawingWall && wallStart && wallPreview && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1000
            }}
          >
            <line
              x1={wallStart.x}
              y1={wallStart.y}
              x2={wallPreview.x}
              y2={wallPreview.y}
              stroke="#3b82f6"
              strokeWidth={4 / zoom}
              strokeDasharray="5,5"
              opacity={0.7}
            />
          </svg>
        )}

        {/* Removed selection box */}

        {/* Render all elements - optimized for performance */}
        {scene?.elements.map((element) => (
          <CameraPlotElement
            key={element.id}
            element={element}
            isSelected={selectedElements.includes(element.id)}
            onUpdate={onUpdateElement}
            onDelete={onDeleteElement}
            onDuplicate={onDuplicateElement}
            onSelect={onSelectElement}
            snapToGrid={snapToGrid}
            allElements={scene.elements}
            selectedElements={scene.elements.filter(el => selectedElements.includes(el.id))}
            zoom={zoom}
            pan={pan}
          />
        ))}

        <CameraPlotEmptyState 
          hasElements={!!scene?.elements.length}
          isDrawingWall={isDrawingWall}
        />
      </div>
    </div>
  );
});

CameraPlotCanvas.displayName = 'CameraPlotCanvas';

export default CameraPlotCanvas;
