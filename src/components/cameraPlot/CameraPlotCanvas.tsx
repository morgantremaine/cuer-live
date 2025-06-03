
import React, { forwardRef } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';
import CameraPlotElement from './CameraPlotElement';
import CameraPlotGrid from './canvas/CameraPlotGrid';
import CameraPlotWallPreview from './canvas/CameraPlotWallPreview';
import CameraPlotEmptyState from './canvas/CameraPlotEmptyState';
import { useCameraPlotWallDrawing } from '@/hooks/cameraPlot/useCameraPlotWallDrawing';
import { useCameraPlotCanvasHandlers } from '@/hooks/cameraPlot/canvas/useCameraPlotCanvasHandlers';

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
  const {
    isDrawing: isDrawingWall,
    currentPath,
    previewPoint,
    startDrawing,
    addPoint,
    updatePreview,
    finishDrawing
  } = useCameraPlotWallDrawing();

  const {
    mousePos,
    handleCanvasClick,
    handleMouseMove,
    handleDoubleClick
  } = useCameraPlotCanvasHandlers({
    selectedTool,
    onAddElement,
    onSelectElement,
    snapToGrid,
    isDrawingWall,
    currentPath,
    startDrawing,
    addPoint,
    updatePreview,
    finishDrawing,
    scene,
    onUpdateElement
  });

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
        <CameraPlotGrid showGrid={showGrid || false} />

        <CameraPlotWallPreview
          isDrawingWall={isDrawingWall}
          currentPath={currentPath}
          previewPoint={previewPoint}
          mousePos={mousePos}
        />

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
