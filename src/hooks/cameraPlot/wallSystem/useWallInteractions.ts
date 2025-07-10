import { useCallback, useEffect, useRef } from 'react';
import { useWallDrawing } from './useWallDrawing';

interface UseWallInteractionsProps {
  selectedTool: string;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

export const useWallInteractions = ({
  selectedTool,
  snapToGrid
}: UseWallInteractionsProps) => {
  const wallDrawing = useWallDrawing();
  const canvasRef = useRef<HTMLElement | null>(null);

  // Handle mouse down on canvas for wall drawing
  const handleCanvasMouseDown = useCallback((x: number, y: number) => {
    console.log('🖱️ Wall tool canvas click:', { selectedTool, x, y });
    if (selectedTool !== 'wall') return false;

    const snapped = snapToGrid(x, y);
    
    if (!wallDrawing.drawingState.isDrawing) {
      wallDrawing.startDrawing(snapped.x, snapped.y);
    } else {
      wallDrawing.addPoint(snapped.x, snapped.y);
    }
    
    return true;
  }, [selectedTool, snapToGrid, wallDrawing]);

  // Handle mouse move for wall drawing preview
  const handleCanvasMouseMove = useCallback((x: number, y: number) => {
    if (selectedTool === 'wall' && wallDrawing.drawingState.isDrawing) {
      const snapped = snapToGrid(x, y);
      wallDrawing.updatePreview(snapped.x, snapped.y);
    }
  }, [selectedTool, snapToGrid, wallDrawing]);

  // Handle double click to finish wall drawing
  const handleCanvasDoubleClick = useCallback(() => {
    if (selectedTool === 'wall' && wallDrawing.drawingState.isDrawing) {
      wallDrawing.finishDrawing();
      return true;
    }
    return false;
  }, [selectedTool, wallDrawing]);

  // Handle node dragging
  const handleNodeMouseDown = useCallback((nodeId: string, event: React.MouseEvent) => {
    if (selectedTool !== 'select') return;
    
    event.stopPropagation();
    const canvasElement = (event.currentTarget as SVGElement).closest('[data-canvas="true"]') as HTMLElement;
    if (!canvasElement) return;
    
    canvasRef.current = canvasElement;
    const node = wallDrawing.getNode(nodeId);
    if (!node) return;
    
    const canvasRect = canvasElement.getBoundingClientRect();
    const dragOffset = {
      x: event.clientX - canvasRect.left - node.x,
      y: event.clientY - canvasRect.top - node.y
    };
    
    wallDrawing.setInteractionState(prev => ({
      ...prev,
      selectedNodeId: nodeId,
      dragOffset,
      isDragging: true
    }));
  }, [selectedTool, wallDrawing]);

  // Handle global mouse move for node dragging
  const handleGlobalMouseMove = useCallback((event: MouseEvent) => {
    const { interactionState } = wallDrawing;
    
    if (!interactionState.isDragging || !interactionState.selectedNodeId || !interactionState.dragOffset || !canvasRef.current) {
      return;
    }
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - canvasRect.left - interactionState.dragOffset.x;
    const y = event.clientY - canvasRect.top - interactionState.dragOffset.y;
    const snapped = snapToGrid(x, y);
    
    wallDrawing.updateNodePosition(interactionState.selectedNodeId, snapped.x, snapped.y);
  }, [wallDrawing, snapToGrid]);

  // Handle global mouse up to end dragging
  const handleGlobalMouseUp = useCallback(() => {
    wallDrawing.setInteractionState(prev => ({
      ...prev,
      selectedNodeId: null,
      dragOffset: null,
      isDragging: false
    }));
    canvasRef.current = null;
  }, [wallDrawing]);

  // Set up global mouse event listeners for dragging
  useEffect(() => {
    const { interactionState } = wallDrawing;
    
    if (interactionState.isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [wallDrawing.interactionState.isDragging, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Handle node hover
  const handleNodeMouseEnter = useCallback((nodeId: string) => {
    wallDrawing.setInteractionState(prev => ({
      ...prev,
      hoveredNodeId: nodeId
    }));
  }, [wallDrawing]);

  // Handle node unhover
  const handleNodeMouseLeave = useCallback(() => {
    wallDrawing.setInteractionState(prev => ({
      ...prev,
      hoveredNodeId: null
    }));
  }, [wallDrawing]);

  // Cancel current wall drawing
  const cancelWallDrawing = useCallback(() => {
    if (wallDrawing.drawingState.isDrawing) {
      wallDrawing.cancelDrawing();
    }
  }, [wallDrawing]);

  return {
    wallDrawing,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasDoubleClick,
    handleNodeMouseDown,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    cancelWallDrawing
  };
};