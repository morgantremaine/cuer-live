import React, { forwardRef, useRef, useEffect, useState, useCallback } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';
import SimpleCameraPlotElement from './SimpleCameraPlotElement';
import CameraPlotEmptyState from '../canvas/CameraPlotEmptyState';

interface SimpleCameraPlotCanvasProps {
  scene: CameraPlotScene | undefined;
  selectedTool: string;
  selectedElements: string[];
  zoom: number;
  pan: { x: number; y: number };
  updatePan: (deltaX: number, deltaY: number) => void;
  onAddElement: (type: string, x: number, y: number) => void;
  onUpdateElement: (elementId: string, updates: Partial<CameraElement>) => void;
  onDeleteElement: (elementId: string) => void;
  onDuplicateElement?: (elementId: string) => void;
  onSelectElement: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const GRID_SIZE = 40;

const SimpleCameraPlotCanvas = forwardRef<HTMLDivElement, SimpleCameraPlotCanvasProps>(({
  scene,
  selectedTool,
  selectedElements,
  zoom,
  pan,
  updatePan,
  onAddElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onSelectElement,
  snapToGrid
}, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - pan.x) / zoom;
    const y = (screenY - rect.top - pan.y) / zoom;
    
    return { x, y };
  }, [zoom, pan]);

  // Canvas click handler
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (isPanning) return;
    
    // Only handle clicks on the canvas background
    if (e.target !== e.currentTarget) return;
    
    if (selectedTool === 'select') {
      // Clear selection when clicking empty space
      onSelectElement('', false);
      return;
    }

    // Add new element
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const snapped = snapToGrid(x, y);
    onAddElement(selectedTool, snapped.x, snapped.y);
  }, [selectedTool, onSelectElement, onAddElement, snapToGrid, screenToCanvas, isPanning]);

  // Mouse down handler for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2 && selectedTool === 'select') { // Right click for panning
      e.preventDefault();
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [selectedTool]);

  // Mouse move handler for panning
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      updatePan(deltaX, deltaY);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastPanPoint, updatePan]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Keyboard event handler for delete
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

  // Render grid pattern
  const renderGrid = () => {
    const lines = [];
    const startX = Math.floor(-pan.x / (GRID_SIZE * zoom)) * GRID_SIZE;
    const endX = startX + Math.ceil(CANVAS_WIDTH / zoom) + GRID_SIZE;
    const startY = Math.floor(-pan.y / (GRID_SIZE * zoom)) * GRID_SIZE;
    const endY = startY + Math.ceil(CANVAS_HEIGHT / zoom) + GRID_SIZE;

    // Vertical lines
    for (let x = startX; x <= endX; x += GRID_SIZE) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={startY}
          x2={x}
          y2={endY}
          stroke="currentColor"
          strokeWidth={0.5 / zoom}
          opacity={0.2}
        />
      );
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += GRID_SIZE) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={startX}
          y1={y}
          x2={endX}
          y2={y}
          stroke="currentColor"
          strokeWidth={0.5 / zoom}
          opacity={0.2}
        />
      );
    }

    return (
      <svg
        className="absolute inset-0 pointer-events-none text-gray-400"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
        }}
      >
        {lines}
      </svg>
    );
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-gray-600">
      <div
        ref={canvasRef}
        className="relative bg-gray-600"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          cursor: selectedTool === 'select' ? (isPanning ? 'grabbing' : 'default') : 'crosshair',
        }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        tabIndex={0}
      >
        {/* Grid */}
        {renderGrid()}

        {/* Content container with zoom and pan transforms */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: '0 0',
          }}
        >
          {/* Render elements */}
          {scene?.elements.map((element) => (
            <SimpleCameraPlotElement
              key={element.id}
              element={element}
              isSelected={selectedElements.includes(element.id)}
              onUpdate={onUpdateElement}
              onDelete={onDeleteElement}
              onDuplicate={onDuplicateElement}
              onSelect={onSelectElement}
              snapToGrid={snapToGrid}
              zoom={zoom}
              pan={pan}
            />
          ))}
        </div>

        {/* Empty state */}
        <CameraPlotEmptyState 
          hasElements={!!scene?.elements.length}
          isDrawingWall={false}
        />
      </div>
    </div>
  );
});

SimpleCameraPlotCanvas.displayName = 'SimpleCameraPlotCanvas';

export default SimpleCameraPlotCanvas;