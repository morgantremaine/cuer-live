import React from 'react';
import { WallSystem, WallNode, WallSegment } from '@/hooks/cameraPlot/wallSystem/types';

interface WallSystemRendererProps {
  wallSystem: WallSystem;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  isDragging: boolean;
  onNodeMouseDown: (nodeId: string, event: React.MouseEvent) => void;
  onNodeMouseEnter: (nodeId: string) => void;
  onNodeMouseLeave: () => void;
  onNodeContextMenu?: (nodeId: string, event: React.MouseEvent) => void;
  onSegmentContextMenu?: (segmentId: string, event: React.MouseEvent) => void;
  scale?: number;
}

const WallSystemRenderer: React.FC<WallSystemRendererProps> = ({
  wallSystem,
  selectedNodeId,
  hoveredNodeId,
  isDragging,
  onNodeMouseDown,
  onNodeMouseEnter,
  onNodeMouseLeave,
  onNodeContextMenu,
  onSegmentContextMenu,
  scale = 1
}) => {
  console.log('🎨 WallSystemRenderer render:', {
    nodeCount: wallSystem.nodes.length,
    segmentCount: wallSystem.segments.length,
    nodes: wallSystem.nodes,
    segments: wallSystem.segments
  });
  // Helper function to get node by ID
  const getNode = (nodeId: string): WallNode | undefined => {
    return wallSystem.nodes.find(n => n.id === nodeId);
  };

  // Render a single wall segment
  const renderSegment = (segment: WallSegment) => {
    const startNode = getNode(segment.startNodeId);
    const endNode = getNode(segment.endNodeId);
    
    if (!startNode || !endNode) return null;

    return (
      <line
        key={segment.id}
        x1={startNode.x}
        y1={startNode.y}
        x2={endNode.x}
        y2={endNode.y}
        stroke="#000000"
        strokeWidth={segment.thickness * scale}
        strokeLinecap="round"
        className="pointer-events-auto cursor-pointer"
        onContextMenu={(e) => {
          if (onSegmentContextMenu) {
            e.preventDefault();
            e.stopPropagation();
            onSegmentContextMenu(segment.id, e);
          }
        }}
      />
    );
  };

  // Render a single node (control point)
  const renderNode = (node: WallNode) => {
    const isSelected = selectedNodeId === node.id;
    const isHovered = hoveredNodeId === node.id;
    const radius = (isSelected || isHovered) ? 5 : 4; // Smaller control points
    
    return (
      <circle
        key={node.id}
        cx={node.x}
        cy={node.y}
        r={radius * scale}
        fill={isSelected ? "#4f46e5" : "#6b7280"} // Grey fill, blue when selected
        stroke={isSelected ? "#3730a3" : "#4b5563"} // Darker grey stroke, darker blue when selected
        strokeWidth={1.5 * scale}
        className={`cursor-pointer transition-all duration-150 ${
          isHovered ? 'drop-shadow-lg' : ''
        }`}
        onMouseDown={(e) => onNodeMouseDown(node.id, e)}
        onMouseEnter={() => onNodeMouseEnter(node.id)}
        onMouseLeave={onNodeMouseLeave}
        onContextMenu={(e) => {
          if (onNodeContextMenu) {
            e.preventDefault();
            e.stopPropagation();
            onNodeContextMenu(node.id, e);
          }
        }}
        style={{
          filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : undefined
        }}
      />
    );
  };

  if (wallSystem.nodes.length === 0 && wallSystem.segments.length === 0) {
    return null;
  }

  return (
    <svg
      className={`absolute inset-0 pointer-events-none ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{ width: '100%', height: '100%', zIndex: 30 }}
    >
      {/* Render all wall segments first (behind nodes) */}
      <g className="wall-segments">
        {wallSystem.segments.map(renderSegment)}
      </g>
      
      {/* Render all nodes (control points) on top */}
      <g className="wall-nodes pointer-events-auto">
        {wallSystem.nodes.map(renderNode)}
      </g>
    </svg>
  );
};

export default WallSystemRenderer;