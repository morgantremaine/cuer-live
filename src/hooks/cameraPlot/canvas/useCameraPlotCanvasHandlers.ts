
import { useState } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';

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
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

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
    const snapped = snapToGrid(x, y);
    onAddElement(selectedTool, snapped.x, snapped.y);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectedTool === 'select' && e.target === e.currentTarget) {
      if (e.button === 2) { // Right click
        setIsRightClickPanning(true);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY, rect);
    const snappedPos = snapToGrid(x, y);
    setMousePos(snappedPos);

    // Handle panning (right-click drag only)
    if (isRightClickPanning && selectedTool === 'select') {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      updatePan(deltaX, deltaY);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsRightClickPanning(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Simple double click handling if needed in the future
  };

  return {
    mousePos,
    handleCanvasClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    isRightClickPanning
  };
};
