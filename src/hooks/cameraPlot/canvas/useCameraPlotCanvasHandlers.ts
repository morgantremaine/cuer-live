
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
    if (isPanning) return;

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
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY, rect);
    const snappedPos = snapToGrid(x, y);
    setMousePos(snappedPos);

    // Handle panning
    if (isPanning && selectedTool === 'select') {
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
    setIsPanning(false);
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
    previewPoint: wallHandlers.previewPoint
  };
};
