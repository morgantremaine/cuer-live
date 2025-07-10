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
    console.log('📍 Creating node:', { nodeId, x, y });
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
    console.log('🔗 Creating segment:', { segmentId, startNodeId, endNodeId, thickness });
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
    setWallSystem(prev => {
      const segmentToDelete = prev.segments.find(s => s.id === segmentId);
      if (!segmentToDelete) return prev;

      // Remove the segment
      const remainingSegments = prev.segments.filter(s => s.id !== segmentId);
      
      // Update nodes to remove reference to deleted segment
      const updatedNodes = prev.nodes.map(node => ({
        ...node,
        connectedSegmentIds: node.connectedSegmentIds.filter(id => id !== segmentId)
      }));

      // Remove any nodes that are no longer connected to any segments
      const finalNodes = updatedNodes.filter(node => node.connectedSegmentIds.length > 0);

      return {
        nodes: finalNodes,
        segments: remainingSegments
      };
    });
  }, []);

  // Split a segment by adding a new node in the middle
  const splitSegment = useCallback((segmentId: string) => {
    setWallSystem(prev => {
      const segment = prev.segments.find(s => s.id === segmentId);
      if (!segment) return prev;

      const startNode = prev.nodes.find(n => n.id === segment.startNodeId);
      const endNode = prev.nodes.find(n => n.id === segment.endNodeId);
      if (!startNode || !endNode) return prev;

      // Calculate middle point
      const midX = (startNode.x + endNode.x) / 2;
      const midY = (startNode.y + endNode.y) / 2;
      
      // Create new node
      const newNodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newNode = {
        id: newNodeId,
        x: midX,
        y: midY,
        connectedSegmentIds: []
      };

      // Create two new segments
      const segment1Id = `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const segment2Id = `segment_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`;
      
      const segment1 = {
        id: segment1Id,
        startNodeId: segment.startNodeId,
        endNodeId: newNodeId,
        thickness: segment.thickness
      };

      const segment2 = {
        id: segment2Id,
        startNodeId: newNodeId,
        endNodeId: segment.endNodeId,
        thickness: segment.thickness
      };

      // Update node connections
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === segment.startNodeId) {
          return {
            ...node,
            connectedSegmentIds: node.connectedSegmentIds
              .filter(id => id !== segmentId)
              .concat(segment1Id)
          };
        }
        if (node.id === segment.endNodeId) {
          return {
            ...node,
            connectedSegmentIds: node.connectedSegmentIds
              .filter(id => id !== segmentId)
              .concat(segment2Id)
          };
        }
        return node;
      }).concat({
        ...newNode,
        connectedSegmentIds: [segment1Id, segment2Id]
      });

      // Remove old segment and add new segments
      const updatedSegments = prev.segments
        .filter(s => s.id !== segmentId)
        .concat(segment1, segment2);

      return {
        nodes: updatedNodes,
        segments: updatedSegments
      };
    });
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
    splitSegment,
    findClosestNode,
    getNode,
    getSegment,
    clearWalls,
    loadWallSystem
  };
};