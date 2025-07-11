
import React, { forwardRef, useEffect } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';
import CameraPlotElement from './CameraPlotElement';
import CameraPlotGrid from './canvas/CameraPlotGrid';
import CameraPlotEmptyState from './canvas/CameraPlotEmptyState';
import SimpleWallDrawingOverlay from './canvas/SimpleWallDrawingOverlay';
import { useCameraPlotCanvasHandlers } from '@/hooks/cameraPlot/canvas/useCameraPlotCanvasHandlers';
import { useSimpleWallDrawing } from '@/hooks/cameraPlot/wallDrawing/useSimpleWallDrawing';

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
  // Wall drawing system
  const {
    isDrawing: isDrawingWall,
    wallPoints,
    previewPoint,
    startWallDrawing,
    addWallPoint,
    updatePreview,
    finishWallDrawing,
    cancelWallDrawing
  } = useSimpleWallDrawing();

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
    updatePan,
    // Wall drawing callbacks
    isDrawingWall,
    startWallDrawing,
    addWallPoint,
    updatePreview,
    finishWallDrawing,
    cancelWallDrawing
  });

  // Add keyboard event listener for delete key and wall drawing controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        selectedElements.forEach(elementId => {
          onDeleteElement(elementId);
        });
      }
      
      // Wall drawing controls
      if (isDrawingWall) {
        if (e.key === 'Enter') {
          // Finish wall drawing
          const wallElements = finishWallDrawing();
          if (wallElements.length > 0 && scene) {
            const updatedElements = [...scene.elements, ...wallElements];
            updatePlot(scene.id, { elements: updatedElements });
          }
          setSelectedTool('select');
        } else if (e.key === 'Escape') {
          // Cancel wall drawing
          cancelWallDrawing();
          setSelectedTool('select');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElements, onDeleteElement, isDrawingWall, finishWallDrawing, cancelWallDrawing, scene, updatePlot, setSelectedTool]);

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

        {/* Render all elements */}
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

        {/* Wall drawing overlay */}
        <SimpleWallDrawingOverlay
          isDrawing={isDrawingWall}
          wallPoints={wallPoints}
          previewPoint={previewPoint}
        />
      </div>
    </div>
  );
});

CameraPlotCanvas.displayName = 'CameraPlotCanvas';

export default CameraPlotCanvas;
