import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WallNode, WallSegment, WallSystem, WallInteractionState } from './types';

export const useWallSystem = () => {
  const [wallSystem, setWallSystem] = useState<WallSystem>({
    nodes: [],
    segments: []
  });
  
  const [interactionState, setInteractionState] = useState<WallInteractionState>({
    selectedNodeId: null,
    dragOffset: null,
    isDragging: false,
    hoveredNodeId: null
  });

  // Create a new node at the given position
  const createNode = useCallback((x: number, y: number): string => {
    const nodeId = uuidv4();
    const newNode: WallNode = {
      id: nodeId,
      x,
      y,
      connectedSegmentIds: []
    };
    
    setWallSystem(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    
    return nodeId;
  }, []);

  // Create a wall segment between two nodes
  const createSegment = useCallback((startNodeId: string, endNodeId: string, thickness = 4): string => {
    const segmentId = uuidv4();
    const newSegment: WallSegment = {
      id: segmentId,
      startNodeId,
      endNodeId,
      thickness
    };
    
    setWallSystem(prev => ({
      ...prev,
      segments: [...prev.segments, newSegment],
      nodes: prev.nodes.map(node => {
        if (node.id === startNodeId || node.id === endNodeId) {
          return {
            ...node,
            connectedSegmentIds: [...node.connectedSegmentIds, segmentId]
          };
        }
        return node;
      })
    }));
    
    return segmentId;
  }, []);

  // Update node position
  const updateNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    setWallSystem(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId ? { ...node, x, y } : node
      )
    }));
  }, []);

  // Delete a node and all connected segments
  const deleteNode = useCallback((nodeId: string) => {
    setWallSystem(prev => {
      const nodeToDelete = prev.nodes.find(n => n.id === nodeId);
      if (!nodeToDelete) return prev;

      // Remove all segments connected to this node
      const segmentsToRemove = nodeToDelete.connectedSegmentIds;
      const remainingSegments = prev.segments.filter(s => !segmentsToRemove.includes(s.id));
      
      // Update other nodes to remove references to deleted segments
      const updatedNodes = prev.nodes
        .filter(n => n.id !== nodeId)
        .map(node => ({
          ...node,
          connectedSegmentIds: node.connectedSegmentIds.filter(id => !segmentsToRemove.includes(id))
        }));

      return {
        nodes: updatedNodes,
        segments: remainingSegments
      };
    });
  }, []);

  // Delete a segment
  const deleteSegment = useCallback((segmentId: string) => {
    setWallSystem(prev => ({
      ...prev,
      segments: prev.segments.filter(s => s.id !== segmentId),
      nodes: prev.nodes.map(node => ({
        ...node,
        connectedSegmentIds: node.connectedSegmentIds.filter(id => id !== segmentId)
      }))
    }));
  }, []);

  // Find the closest node to a given point (for snapping)
  const findClosestNode = useCallback((x: number, y: number, maxDistance = 20): WallNode | null => {
    let closestNode: WallNode | null = null;
    let minDistance = maxDistance;

    wallSystem.nodes.forEach(node => {
      const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestNode = node;
      }
    });

    return closestNode;
  }, [wallSystem.nodes]);

  // Get node by ID
  const getNode = useCallback((nodeId: string): WallNode | undefined => {
    return wallSystem.nodes.find(n => n.id === nodeId);
  }, [wallSystem.nodes]);

  // Get segment by ID
  const getSegment = useCallback((segmentId: string): WallSegment | undefined => {
    return wallSystem.segments.find(s => s.id === segmentId);
  }, [wallSystem.segments]);

  // Clear all walls
  const clearWalls = useCallback(() => {
    setWallSystem({ nodes: [], segments: [] });
    setInteractionState({
      selectedNodeId: null,
      dragOffset: null,
      isDragging: false,
      hoveredNodeId: null
    });
  }, []);

  // Load wall system from data
  const loadWallSystem = useCallback((data: WallSystem) => {
    setWallSystem(data);
  }, []);

  return {
    wallSystem,
    interactionState,
    setInteractionState,
    createNode,
    createSegment,
    updateNodePosition,
    deleteNode,
    deleteSegment,
    findClosestNode,
    getNode,
    getSegment,
    clearWalls,
    loadWallSystem
  };
};