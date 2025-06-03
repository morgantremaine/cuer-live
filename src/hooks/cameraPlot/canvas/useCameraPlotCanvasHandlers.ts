
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
}

export const useCameraPlotCanvasHandlers = ({
  selectedTool,
  onAddElement,
  onSelectElement,
  snapToGrid,
  scene,
  onUpdateElement,
  updatePlot
}: UseCameraPlotCanvasHandlersProps) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const wallHandlers = useWallCanvasHandlers({
    selectedTool,
    snapToGrid,
    activeScene: scene,
    updatePlot
  });

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (selectedTool === 'select') {
      if (e.target === e.currentTarget) {
        onSelectElement('', false);
      }
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle wall tool clicks
    if (wallHandlers.handleWallClick(x, y)) {
      return;
    }

    // Handle other tools
    const snapped = snapToGrid(x, y);
    onAddElement(selectedTool, snapped.x, snapped.y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    const snappedPos = snapToGrid(rawPos.x, rawPos.y);
    setMousePos(snappedPos);

    // Handle wall tool mouse movement
    wallHandlers.handleWallMouseMove(rawPos.x, rawPos.y);
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
    handleMouseMove,
    handleDoubleClick,
    // Expose wall drawing state for preview rendering
    isDrawingWall: wallHandlers.isDrawing,
    currentPath: wallHandlers.currentPath,
    previewPoint: wallHandlers.previewPoint
  };
};
