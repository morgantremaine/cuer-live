
import { useState } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';
import { useWallCanvasHandlers } from '../wallDrawing/useWallCanvasHandlers';

interface UseCameraPlotCanvasHandlersProps {
  selectedTool: string;
  onAddElement: (type: string, x: number, y: number) => void;
  onSelectElement: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  scene: CameraPlotScene | undefined;
  onUpdateElement: (elementId: string, updates: Partial<CameraElement>) => void;
  updatePlot: (plotId: string, updatedPlot: Partial<CameraPlotScene>) => void;
  setSelectedTool: (tool: string) => void;
  zoom: number;
  pan: { x: number; y: number };
  updatePan: (deltaX: number, deltaY: number) => void;
}

export const useCameraPlotCanvasHandlers = ({
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
}: UseCameraPlotCanvasHandlersProps) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isRightClickPanning, setIsRightClickPanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  const wallHandlers = useWallCanvasHandlers({
    selectedTool,
    snapToGrid,
    activeScene: scene,
    updatePlot,
    setSelectedTool
  });

  const getCanvasCoordinates = (clientX: number, clientY: number, rect: DOMRect) => {
    // Account for zoom and pan
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isPanning || isRightClickPanning) return;

    if (selectedTool === 'select') {
      if (e.target === e.currentTarget) {
        onSelectElement('', false);
      }
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY, rect);

    // Handle wall tool clicks
    if (wallHandlers.handleWallClick(x, y)) {
      return;
    }

    // Handle other tools
    const snapped = snapToGrid(x, y);
    onAddElement(selectedTool, snapped.x, snapped.y);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectedTool === 'select' && e.target === e.currentTarget) {
      if (e.button === 2) { // Right click
        setIsRightClickPanning(true);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
      } else if (e.button === 0) { // Left click
        const rect = e.currentTarget.getBoundingClientRect();
        const { x, y } = getCanvasCoordinates(e.clientX, e.clientY, rect);
        setIsSelecting(true);
        setSelectionStart({ x, y });
        setSelectionEnd({ x, y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY, rect);
    const snappedPos = snapToGrid(x, y);
    setMousePos(snappedPos);

    // Handle selection box dragging
    if (isSelecting && selectedTool === 'select') {
      setSelectionEnd({ x, y });
      return;
    }

    // Handle panning (right-click drag only)
    if (isRightClickPanning && selectedTool === 'select') {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      updatePan(deltaX, deltaY);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handle wall tool mouse movement with canvas coordinates
    wallHandlers.handleWallMouseMove(x, y);
  };

  const handleMouseUp = () => {
    // Handle selection box completion
    if (isSelecting && selectedTool === 'select' && scene) {
      const minX = Math.min(selectionStart.x, selectionEnd.x);
      const maxX = Math.max(selectionStart.x, selectionEnd.x);
      const minY = Math.min(selectionStart.y, selectionEnd.y);
      const maxY = Math.max(selectionStart.y, selectionEnd.y);

      // Only process selection if there's a meaningful drag (at least 5 pixels in canvas coordinates)
      const dragDistance = Math.abs(selectionEnd.x - selectionStart.x) + Math.abs(selectionEnd.y - selectionStart.y);
      
      console.log('Selection box:', { minX, maxX, minY, maxY, dragDistance });
      
      if (dragDistance > 5) {
        // Find elements that intersect with the selection box
        const selectedElementIds = scene.elements
          .filter(element => {
            const elementLeft = element.x;
            const elementRight = element.x + element.width;
            const elementTop = element.y;
            const elementBottom = element.y + element.height;

            console.log(`Element ${element.id}:`, { 
              elementLeft, elementRight, elementTop, elementBottom,
              intersects: !(elementRight < minX || elementLeft > maxX || elementBottom < minY || elementTop > maxY)
            });

            // Check if element intersects with selection box
            return !(elementRight < minX || elementLeft > maxX || elementBottom < minY || elementTop > maxY);
          })
          .map(element => element.id);

        console.log('Selected elements:', selectedElementIds);

        // Select all intersecting elements
        if (selectedElementIds.length > 0) {
          // Clear existing selection first, then select all found elements
          onSelectElement('', false);
          selectedElementIds.forEach((elementId, index) => {
            onSelectElement(elementId, true); // Multi-select for all elements
          });
        } else {
          onSelectElement('', false); // Clear selection if no elements found
        }
      }
    }

    setIsPanning(false);
    setIsRightClickPanning(false);
    setIsSelecting(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Handle wall tool double click
    if (wallHandlers.handleWallDoubleClick()) {
      return;
    }
  };

  return {
    mousePos,
    handleCanvasClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    // Expose wall drawing state for preview rendering
    isDrawingWall: wallHandlers.isDrawing,
    currentPath: wallHandlers.currentPath,
    previewPoint: wallHandlers.previewPoint,
    // Expose selection box state
    isSelecting,
    selectionStart,
    selectionEnd
  };
};
