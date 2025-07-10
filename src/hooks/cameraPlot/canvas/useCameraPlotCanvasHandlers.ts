
import { useState } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';

interface WallInteractions {
  handleCanvasMouseDown: (x: number, y: number) => boolean;
  handleCanvasMouseMove: (x: number, y: number) => void;
  handleCanvasDoubleClick: () => boolean;
  wallDrawing: {
    drawingState: {
      isDrawing: boolean;
      currentPath: string[];
      previewPoint: { x: number; y: number } | null;
    };
  };
}

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
  wallInteractions: WallInteractions;
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
  updatePan,
  wallInteractions
}: UseCameraPlotCanvasHandlersProps) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isRightClickPanning, setIsRightClickPanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  // Use the wall interactions passed from parent instead of creating new ones
  const wallHandlers = wallInteractions;

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
    if (wallHandlers.handleCanvasMouseDown(x, y)) {
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
      } else if (e.button === 0) { // Left click - remove selection box functionality
        // No selection box anymore
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY, rect);
    const snappedPos = snapToGrid(x, y);
    setMousePos(snappedPos);

    // Update mouse position (remove selection box updates)
    setMousePos(snappedPos);

    // Handle panning (right-click drag only)
    if (isRightClickPanning && selectedTool === 'select') {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      updatePan(deltaX, deltaY);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handle wall tool mouse movement with canvas coordinates
    wallHandlers.handleCanvasMouseMove(x, y);
  };

  const handleMouseUp = () => {
    // Remove all selection box logic
    setIsPanning(false);
    setIsRightClickPanning(false);
    setIsSelecting(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Handle wall tool double click
    if (wallHandlers.handleCanvasDoubleClick()) {
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
    isDrawingWall: wallHandlers.wallDrawing.drawingState.isDrawing,
    currentPath: wallHandlers.wallDrawing.drawingState.currentPath,
    previewPoint: wallHandlers.wallDrawing.drawingState.previewPoint,
    // Expose selection box state
    isSelecting,
    selectionStart,
    selectionEnd
  };
};
