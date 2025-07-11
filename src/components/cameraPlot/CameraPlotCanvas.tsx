
import React, { forwardRef, useEffect } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';
import CameraPlotElement from './CameraPlotElement';
import CameraPlotGrid from './canvas/CameraPlotGrid';
import WallSystemRenderer from './wallSystem/WallSystemRenderer';
import WallDrawingPreview from './wallSystem/WallDrawingPreview';
import { WallNodeContextMenu, WallSegmentContextMenu } from './wallSystem/WallContextMenu';
import CameraPlotEmptyState from './canvas/CameraPlotEmptyState';
import { useCameraPlotCanvasHandlers } from '@/hooks/cameraPlot/canvas/useCameraPlotCanvasHandlers';

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
  setSelectedTool
}, ref) => {
  const {
    mousePos,
    handleCanvasClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    isRightClickPanning
  } = useCameraPlotCanvasHandlers({
    selectedTool,
    onAddElement,
    onSelectElement,
    snapToGrid,
    scene,
    onUpdateElement,
    updatePlot,
    setSelectedTool,
    zoom,
    pan,
    updatePan
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
        {showGrid && (
          <CameraPlotGrid showGrid={showGrid} />
        )}

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
          isDrawingWall={false}
        />
      </div>
    </div>
  );
});

CameraPlotCanvas.displayName = 'CameraPlotCanvas';

export default CameraPlotCanvas;
