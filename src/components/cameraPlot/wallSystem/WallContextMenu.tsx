import React from 'react';

interface WallNodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

export const WallNodeContextMenu: React.FC<WallNodeContextMenuProps> = ({
  x,
  y,
  nodeId,
  onDeleteNode,
  onClose
}) => {
  const handleDeleteNode = () => {
    onDeleteNode(nodeId);
    onClose();
  };

  return (
    <div
      className="fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50"
      style={{ left: x, top: y }}
      onMouseLeave={onClose}
    >
      <button
        className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 text-sm"
        onClick={handleDeleteNode}
      >
        Delete Control Point
      </button>
    </div>
  );
};

interface WallSegmentContextMenuProps {
  x: number;
  y: number;
  segmentId: string;
  onDeleteSegment: (segmentId: string) => void;
  onSplitSegment: (segmentId: string) => void;
  onClose: () => void;
}

export const WallSegmentContextMenu: React.FC<WallSegmentContextMenuProps> = ({
  x,
  y,
  segmentId,
  onDeleteSegment,
  onSplitSegment,
  onClose
}) => {
  const handleDeleteSegment = () => {
    onDeleteSegment(segmentId);
    onClose();
  };

  const handleSplitSegment = () => {
    onSplitSegment(segmentId);
    onClose();
  };

  return (
    <div
      className="fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50"
      style={{ left: x, top: y }}
      onMouseLeave={onClose}
    >
      <button
        className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 text-sm border-b border-gray-600"
        onClick={handleSplitSegment}
      >
        Add Control Point
      </button>
      <button
        className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 text-sm"
        onClick={handleDeleteSegment}
      >
        Delete Wall
      </button>
    </div>
  );
};