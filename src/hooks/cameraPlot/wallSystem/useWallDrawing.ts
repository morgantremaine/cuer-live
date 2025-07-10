import { useState, useCallback } from 'react';
import { useWallSystem } from './useWallSystem';

interface WallDrawingState {
  isDrawing: boolean;
  currentPath: string[]; // Array of node IDs
  previewPoint: { x: number; y: number } | null;
}

export const useWallDrawing = () => {
  const wallSystem = useWallSystem();
  const [drawingState, setDrawingState] = useState<WallDrawingState>({
    isDrawing: false,
    currentPath: [],
    previewPoint: null
  });

  // Start drawing walls
  const startDrawing = useCallback((x: number, y: number) => {
    console.log('🏗️ Starting new wall drawing at:', { x, y });
    // Snap to existing node if close enough, otherwise create new node
    const existingNode = wallSystem.findClosestNode(x, y, 15);
    let startNodeId: string;
    
    if (existingNode) {
      startNodeId = existingNode.id;
    } else {
      startNodeId = wallSystem.createNode(x, y);
    }

    setDrawingState({
      isDrawing: true,
      currentPath: [startNodeId],
      previewPoint: null
    });
  }, [wallSystem]);

  // Add a point to the current drawing path
  const addPoint = useCallback((x: number, y: number) => {
    console.log('🏗️ Adding wall point at:', { x, y });
    if (!drawingState.isDrawing || drawingState.currentPath.length === 0) return;

    // Snap to existing node if close enough, otherwise create new node
    const existingNode = wallSystem.findClosestNode(x, y, 15);
    let newNodeId: string;
    
    if (existingNode) {
      newNodeId = existingNode.id;
    } else {
      newNodeId = wallSystem.createNode(x, y);
    }

    // Don't add the same node twice in a row
    const lastNodeId = drawingState.currentPath[drawingState.currentPath.length - 1];
    if (newNodeId === lastNodeId) return;

    // Create segment between last node and new node
    const segmentId = wallSystem.createSegment(lastNodeId, newNodeId);
    console.log('🔗 Created segment:', { segmentId, from: lastNodeId, to: newNodeId });

    // Update the current path
    setDrawingState(prev => ({
      ...prev,
      currentPath: [...prev.currentPath, newNodeId]
    }));
  }, [drawingState, wallSystem]);

  // Update preview point for drawing
  const updatePreview = useCallback((x: number, y: number) => {
    if (drawingState.isDrawing) {
      setDrawingState(prev => ({
        ...prev,
        previewPoint: { x, y }
      }));
    }
  }, [drawingState.isDrawing]);

  // Finish drawing
  const finishDrawing = useCallback(() => {
    setDrawingState({
      isDrawing: false,
      currentPath: [],
      previewPoint: null
    });
  }, []);

  // Cancel drawing
  const cancelDrawing = useCallback(() => {
    // Remove any nodes that were created during this drawing session
    // that don't have any segments connected
    drawingState.currentPath.forEach(nodeId => {
      const node = wallSystem.getNode(nodeId);
      if (node && node.connectedSegmentIds.length === 0) {
        wallSystem.deleteNode(nodeId);
      }
    });

    setDrawingState({
      isDrawing: false,
      currentPath: [],
      previewPoint: null
    });
  }, [drawingState, wallSystem]);

  return {
    ...wallSystem,
    drawingState,
    startDrawing,
    addPoint,
    updatePreview,
    finishDrawing,
    cancelDrawing
  };
};