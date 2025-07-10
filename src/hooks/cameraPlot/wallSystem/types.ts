// Wall System Types - New intelligent wall system with connected nodes

export interface WallNode {
  id: string;
  x: number;
  y: number;
  connectedSegmentIds: string[];
}

export interface WallSegment {
  id: string;
  startNodeId: string;
  endNodeId: string;
  thickness: number;
}

export interface WallSystem {
  nodes: WallNode[];
  segments: WallSegment[];
}

export interface WallInteractionState {
  selectedNodeId: string | null;
  dragOffset: { x: number; y: number } | null;
  isDragging: boolean;
  hoveredNodeId: string | null;
}

// For converting to/from CameraElement format for compatibility
export interface WallSystemElement {
  id: string;
  type: 'wall-system';
  x: number; // Not used but required for CameraElement compatibility
  y: number; // Not used but required for CameraElement compatibility
  width: number; // Not used but required for CameraElement compatibility
  height: number; // Not used but required for CameraElement compatibility
  rotation: number; // Not used but required for CameraElement compatibility
  scale: number; // Not used but required for CameraElement compatibility
  label: string;
  wallSystemData: WallSystem;
}