import { useCallback, useEffect, useRef, useState } from 'react';
import { useWallDrawing } from './useWallDrawing';

interface UseWallInteractionsProps {
  selectedTool: string;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  zoom: number;
  pan: { x: number; y: number };
}

export const useWallInteractions = ({
  selectedTool,
  snapToGrid,
  zoom,
  pan
}: UseWallInteractionsProps) => {
  const wallDrawing = useWallDrawing();
  const canvasRef = useRef<HTMLElement | null>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    type: 'node' | 'segment';
    x: number;
    y: number;
    nodeId?: string;
    segmentId?: string;
  } | null>(null);

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

  // Handle node context menu
  const handleNodeContextMenu = useCallback((nodeId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      type: 'node',
      x: event.clientX,
      y: event.clientY,
      nodeId
    });
  }, []);

  // Handle segment context menu
  const handleSegmentContextMenu = useCallback((segmentId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      type: 'segment',
      x: event.clientX,
      y: event.clientY,
      segmentId
    });
  }, []);

  // Handle delete node
  const handleDeleteNode = useCallback((nodeId: string) => {
    wallDrawing.deleteNode(nodeId);
    setContextMenu(null);
  }, [wallDrawing]);

  // Handle delete segment
  const handleDeleteSegment = useCallback((segmentId: string) => {
    wallDrawing.deleteSegment(segmentId);
    setContextMenu(null);
  }, [wallDrawing]);

  // Handle split segment
  const handleSplitSegment = useCallback((segmentId: string) => {
    wallDrawing.splitSegment(segmentId);
    setContextMenu(null);
  }, [wallDrawing]);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);
  const handleNodeMouseDown = useCallback((nodeId: string, event: React.MouseEvent) => {
    if (selectedTool !== 'select') return;
    
    event.stopPropagation();
    const canvasElement = (event.currentTarget as SVGElement).closest('[data-canvas="true"]') as HTMLElement;
    if (!canvasElement) return;
    
    canvasRef.current = canvasElement;
    const node = wallDrawing.getNode(nodeId);
    if (!node) return;
    
    // Store simple flag - no complex offset calculation needed
    wallDrawing.setInteractionState(prev => ({
      ...prev,
      selectedNodeId: nodeId,
      dragOffset: { x: 0, y: 0 }, // Simple placeholder
      isDragging: true
    }));
  }, [selectedTool, wallDrawing]);

  // Handle global mouse move for node dragging
  const handleGlobalMouseMove = useCallback((event: MouseEvent) => {
    const { interactionState } = wallDrawing;
    
    if (!interactionState.isDragging || !interactionState.selectedNodeId || !canvasRef.current) {
      return;
    }
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    // Convert screen coordinates directly to canvas coordinates
    const screenX = event.clientX - canvasRect.left;
    const screenY = event.clientY - canvasRect.top;
    
    // Apply inverse transform (matching the canvas transform in CameraPlotCanvas)
    const canvasX = (screenX - pan.x) / zoom;
    const canvasY = (screenY - pan.y) / zoom;
    
    console.log('🖱️ Dragging node:', {
      screenX, screenY,
      canvasX, canvasY,
      zoom, pan,
      nodeId: interactionState.selectedNodeId
    });
    
    // Use direct positioning without grid snapping for smooth dragging
    wallDrawing.updateNodePosition(interactionState.selectedNodeId, canvasX, canvasY);
  }, [wallDrawing, zoom, pan]);

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
    contextMenu,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasDoubleClick,
    handleNodeMouseDown,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    handleNodeContextMenu,
    handleSegmentContextMenu,
    handleDeleteNode,
    handleDeleteSegment,
    handleSplitSegment,
    closeContextMenu,
    cancelWallDrawing
  };
};