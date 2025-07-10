
import React, { forwardRef, useEffect } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';
import CameraPlotElement from './CameraPlotElement';
import CameraPlotGrid from './canvas/CameraPlotGrid';
import WallSystemRenderer from './wallSystem/WallSystemRenderer';
import WallDrawingPreview from './wallSystem/WallDrawingPreview';
import CameraPlotEmptyState from './canvas/CameraPlotEmptyState';
import { useCameraPlotWallSystem } from '@/hooks/cameraPlot/core/useCameraPlotWallSystem';
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
  // Wall system integration
  const wallSystem = useCameraPlotWallSystem({
    selectedTool,
    snapToGrid,
    activeScene: scene,
    updatePlot,
    setSelectedTool
  });

  const {
    mousePos,
    handleCanvasClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    isDrawingWall,
    currentPath,
    previewPoint,
    isSelecting,
    selectionStart,
    selectionEnd
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

  // Auto-save wall system changes and load on scene change
  useEffect(() => {
    if (scene) {
      wallSystem.loadWallSystemFromScene();
    }
  }, [scene?.id]);

  // Auto-save when wall system changes
  useEffect(() => {
    if (wallSystem.wallInteractions.wallDrawing.wallSystem.nodes.length > 0 || 
        wallSystem.wallInteractions.wallDrawing.wallSystem.segments.length > 0) {
      wallSystem.handleWallSystemChange();
    }
  }, [wallSystem.wallInteractions.wallDrawing.wallSystem]);

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
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right click
        style={{ 
          width: '2000px', 
          height: '2000px',
          cursor: selectedTool === 'select' ? 'default' : 'crosshair',
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: '0 0'
        }}
        tabIndex={0}
      >
        

        {/* New Wall System Rendering */}
        <WallSystemRenderer
          wallSystem={wallSystem.wallSystemElement?.wallSystemData || { nodes: [], segments: [] }}
          selectedNodeId={wallSystem.wallInteractions.wallDrawing.interactionState.selectedNodeId}
          hoveredNodeId={wallSystem.wallInteractions.wallDrawing.interactionState.hoveredNodeId}
          isDragging={wallSystem.wallInteractions.wallDrawing.interactionState.isDragging}
          onNodeMouseDown={wallSystem.wallInteractions.handleNodeMouseDown}
          onNodeMouseEnter={wallSystem.wallInteractions.handleNodeMouseEnter}
          onNodeMouseLeave={wallSystem.wallInteractions.handleNodeMouseLeave}
          scale={zoom}
        />

        {/* Wall Drawing Preview */}
        <WallDrawingPreview
          isDrawing={wallSystem.wallInteractions.wallDrawing.drawingState.isDrawing}
          currentPath={wallSystem.wallInteractions.wallDrawing.drawingState.currentPath}
          previewPoint={wallSystem.wallInteractions.wallDrawing.drawingState.previewPoint}
          wallSystem={wallSystem.wallInteractions.wallDrawing.wallSystem}
          scale={zoom}
        />

        {/* Removed selection box */}

        {/* Render all elements */}
        {scene?.elements.map((element) => {
          const selectedElementObjects = scene.elements.filter(el => selectedElements.includes(el.id));
          
          return (
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
              selectedElements={selectedElementObjects}
            />
          );
        })}

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
