
import { CameraElement } from '@/hooks/useCameraPlot';
import { useCameraPlotElementDrag } from './interactions/useCameraPlotElementDrag';
import { useCameraPlotMultiElementDrag } from './interactions/useCameraPlotMultiElementDrag';
import { useCameraPlotElementRotation } from './interactions/useCameraPlotElementRotation';
import { useCameraPlotElementScaling } from './interactions/useCameraPlotElementScaling';
import { useCameraPlotElementLabel } from './interactions/useCameraPlotElementLabel';

interface UseCameraPlotElementInteractionsProps {
  element: CameraElement;
  isSelected: boolean;
  selectedElements: CameraElement[];
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
  onSelect: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

export const useCameraPlotElementInteractions = ({
  element,
  isSelected,
  selectedElements,
  onUpdate,
  onSelect,
  snapToGrid
}: UseCameraPlotElementInteractionsProps) => {
  // Determine interaction capabilities
  const canRotate = element.type === 'camera' || element.type === 'person' || element.type === 'furniture';
  const canScale = element.type === 'furniture';

  // Individual interaction hooks - choose between single and multi-element drag
  const shouldUseMultiDrag = selectedElements.length > 1 && selectedElements.some(el => el.id === element.id);
  
  const { isDragging: singleDragging, startDrag: startSingleDrag } = useCameraPlotElementDrag({
    element,
    onUpdate,
    snapToGrid
  });

  const { isDragging: multiDragging, startDrag: startMultiDrag } = useCameraPlotMultiElementDrag({
    elements: selectedElements,
    onUpdate,
    snapToGrid
  });

  const isDragging = shouldUseMultiDrag ? multiDragging : singleDragging;
  const startDrag = shouldUseMultiDrag ? startMultiDrag : startSingleDrag;

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

  const { isLabelDragging, startLabelDrag } = useCameraPlotElementLabel({
    element,
    onUpdate
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.detail === 2) {
      return { isDoubleClick: true };
    }

    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
    onSelect(element.id, isMultiSelect);
    
    // Check if clicking on scale handles
    const target = e.target as HTMLElement;
    const isScaleHandle = target.hasAttribute('data-handle');
    
    if (isScaleHandle && canScale) {
      startScaling(e);
    } else {
      startDrag(e);
    }

    return { isDoubleClick: false };
  };

  const getCursor = () => {
    if (isDragging) return 'grabbing';
    if (isRotating) return 'grabbing';
    if (isScaling) return 'se-resize';
    return 'move';
  };

  return {
    handleMouseDown,
    handleLabelMouseDown: startLabelDrag,
    handleRotationStart: startRotation,
    handleScaleStart: startScaling,
    getCursor,
    isDragging,
    isRotating,
    isScaling,
    canRotate,
    canScale
  };
};
