import { useState, useCallback } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';

interface UseCameraPlotCanvasUnifiedProps {
  selectedTool: string;
  onAddElement: (type: string, x: number, y: number) => void;
  onSelectElement: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  scene: CameraPlotScene | undefined;
  onUpdateElement: (elementId: string, updates: Partial<CameraElement>) => void;
  zoom: number;
  pan: { x: number; y: number };
  updatePan: (deltaX: number, deltaY: number) => void;
  // Wall state
  isDrawingWall: boolean;
  startWallDrawing: (point: { x: number; y: number }) => void;
  updateWallPreview: (point: { x: number; y: number }) => void;
  completeWall: (finalPoint?: { x: number; y: number }) => void;
}

export const useCameraPlotCanvasUnified = ({
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
}: UseCameraPlotCanvasUnifiedProps) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isRightClickPanning, setIsRightClickPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  const getCanvasCoordinates = (clientX: number, clientY: number, rect: DOMRect) => {
    // Proper coordinate transformation accounting for zoom and pan
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (isRightClickPanning) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY, rect);
    const snapped = snapToGrid(x, y);

    // Handle wall tool with proper coordinate handling
    if (selectedTool === 'wall') {
      if (!isDrawingWall) {
        startWallDrawing(snapped);
      } else {
        // Add point to current wall path - will be handled by state
        completeWall(snapped);
      }
      return;
    }

    // Handle select tool
    if (selectedTool === 'select') {
      if (e.target === e.currentTarget) {
        onSelectElement('', false);
      }
      return;
    }

    // Handle other tools
    onAddElement(selectedTool, snapped.x, snapped.y);
  }, [selectedTool, isDrawingWall, startWallDrawing, completeWall, snapToGrid, onAddElement, onSelectElement, isRightClickPanning]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (selectedTool === 'select' && e.target === e.currentTarget) {
      if (e.button === 2) { // Right click for panning
        setIsRightClickPanning(true);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
      }
    }
  }, [selectedTool]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY, rect);
    const snappedPos = snapToGrid(x, y);
    setMousePos(snappedPos);

    // Handle right-click panning
    if (isRightClickPanning && selectedTool === 'select') {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      updatePan(deltaX, deltaY);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handle wall drawing preview
    if (selectedTool === 'wall' && isDrawingWall) {
      updateWallPreview(snappedPos);
    }
  }, [selectedTool, isDrawingWall, updateWallPreview, snapToGrid, isRightClickPanning, lastPanPoint, updatePan]);

  const handleMouseUp = useCallback(() => {
    setIsRightClickPanning(false);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (selectedTool === 'wall' && isDrawingWall) {
      // Complete the wall without adding final point
      completeWall();
      return;
    }
  }, [selectedTool, isDrawingWall, completeWall]);

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