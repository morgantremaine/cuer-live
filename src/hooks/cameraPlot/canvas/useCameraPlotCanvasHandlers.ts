
import { useState } from 'react';
import { CameraPlotScene, CameraElement } from '@/hooks/useCameraPlot';

interface UseCameraPlotCanvasHandlersProps {
  selectedTool: string;
  onAddElement: (type: string, x: number, y: number) => void;
  onSelectElement: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  isDrawingWall: boolean;
  currentPath: { x: number; y: number }[];
  startDrawing: (point: { x: number; y: number }) => void;
  addPoint: (point: { x: number; y: number }) => void;
  updatePreview: (point: { x: number; y: number }) => void;
  finishDrawing: () => any[];
  scene: CameraPlotScene | undefined;
}

export const useCameraPlotCanvasHandlers = ({
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
  scene
}: UseCameraPlotCanvasHandlersProps) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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
    const snapped = snapToGrid(x, y);

    if (selectedTool === 'wall') {
      if (!isDrawingWall) {
        startDrawing(snapped);
      } else {
        addPoint(snapped);
      }
      return;
    }

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

    if (isDrawingWall) {
      updatePreview(snappedPos);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (selectedTool === 'wall' && isDrawingWall) {
      const segments = finishDrawing();
      // Convert segments to wall elements
      segments.forEach((segment) => {
        const length = Math.sqrt(
          Math.pow(segment.end.x - segment.start.x, 2) + 
          Math.pow(segment.end.y - segment.start.y, 2)
        );
        const angle = Math.atan2(
          segment.end.y - segment.start.y, 
          segment.end.x - segment.start.x
        ) * (180 / Math.PI);
        
        const element: Partial<CameraElement> = {
          id: segment.id,
          type: 'wall',
          x: segment.start.x,
          y: segment.start.y - 2,
          width: length,
          height: 4,
          rotation: angle,
          scale: 1,
          label: '',
          labelOffsetX: 0,
          labelOffsetY: -20
        };
        
        if (scene) {
          const updatedElements = [...scene.elements, element as CameraElement];
          scene.elements = updatedElements;
        }
      });
    }
  };

  return {
    mousePos,
    handleCanvasClick,
    handleMouseMove,
    handleDoubleClick
  };
};
