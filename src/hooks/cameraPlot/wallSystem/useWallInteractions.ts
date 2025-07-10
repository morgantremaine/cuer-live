import { useCallback } from 'react';
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

  // Handle mouse down on canvas for wall drawing
  const handleCanvasMouseDown = useCallback((x: number, y: number) => {
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
    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    const node = wallDrawing.getNode(nodeId);
    
    if (!node) return;
    
    const dragOffset = {
      x: event.clientX - rect.left - node.x,
      y: event.clientY - rect.top - node.y
    };
    
    wallDrawing.setInteractionState(prev => ({
      ...prev,
      selectedNodeId: nodeId,
      dragOffset,
      isDragging: true
    }));
  }, [selectedTool, wallDrawing]);

  // Handle global mouse move for node dragging
  const handleGlobalMouseMove = useCallback((event: MouseEvent, containerRect: DOMRect) => {
    const { interactionState } = wallDrawing;
    
    if (!interactionState.isDragging || !interactionState.selectedNodeId || !interactionState.dragOffset) {
      return;
    }
    
    const x = event.clientX - containerRect.left - interactionState.dragOffset.x;
    const y = event.clientY - containerRect.top - interactionState.dragOffset.y;
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
  }, [wallDrawing]);

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
    handleGlobalMouseMove,
    handleGlobalMouseUp,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    cancelWallDrawing
  };
};