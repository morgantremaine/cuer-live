
import { CameraElement } from '@/hooks/useCameraPlot';
import { useCameraPlotElementDrag } from './interactions/useCameraPlotElementDrag';
import { useCameraPlotElementRotation } from './interactions/useCameraPlotElementRotation';
import { useCameraPlotElementScaling } from './interactions/useCameraPlotElementScaling';
import { useCameraPlotElementCursor } from './interactions/useCameraPlotElementCursor';
import { useCameraPlotElementLabel } from './interactions/useCameraPlotElementLabel';

interface UseCameraPlotElementInteractionsProps {
  element: CameraElement;
  isSelected: boolean;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
  onSelect: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

export const useCameraPlotElementInteractions = ({
  element,
  isSelected,
  onUpdate,
  onSelect,
  snapToGrid
}: UseCameraPlotElementInteractionsProps) => {
  // Determine interaction capabilities
  const canRotate = element.type === 'camera' || element.type === 'person';
  const canScale = element.type === 'furniture';

  // Individual interaction hooks
  const { isDragging, startDrag } = useCameraPlotElementDrag({
    element,
    onUpdate,
    snapToGrid
  });

  const { isRotating, startRotation } = useCameraPlotElementRotation({
    element,
    canRotate,
    onUpdate
  });

  const { isScaling, startScaling } = useCameraPlotElementScaling({
    element,
    canScale,
    onUpdate
  });

  const { cursorMode, handleMouseMove, getCursor } = useCameraPlotElementCursor({
    canRotate,
    canScale,
    isDragging,
    isRotating,
    isScaling
  });

  const { isLabelDragging, startLabelDrag } = useCameraPlotElementLabel({
    element,
    onUpdate
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.detail === 2) {
      return { isDoubleClick: true };
    }

    onSelect(element.id, e.ctrlKey || e.metaKey);
    
    if (cursorMode === 'rotate' && canRotate) {
      startRotation();
    } else if (cursorMode === 'scale' && canScale) {
      startScaling(e);
    } else {
      startDrag(e);
    }

    return { isDoubleClick: false };
  };

  return {
    handleMouseDown,
    handleLabelMouseDown: startLabelDrag,
    handleMouseMove,
    getCursor,
    cursorMode,
    isDragging,
    isRotating,
    isScaling
  };
};
