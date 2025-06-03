
import React from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface CameraPlotElementContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  element: CameraElement;
  onClose: () => void;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
  onDelete: (elementId: string) => void;
}

const CameraPlotElementContextMenu = ({ 
  isVisible, 
  position, 
  element, 
  onClose, 
  onUpdate, 
  onDelete 
}: CameraPlotElementContextMenuProps) => {
  if (!isVisible) return null;

  const handleDuplicate = () => {
    onUpdate(element.id, {
      id: `element-${Date.now()}`,
      x: element.x + 20,
      y: element.y + 20
    });
    onClose();
  };

  const handleDelete = () => {
    onDelete(element.id);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      />
      <div
        className="fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50"
        style={{ left: position.x, top: position.y }}
      >
        <button
          className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700"
          onClick={handleDuplicate}
        >
          Duplicate
        </button>
        <button
          className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700"
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
    </>
  );
};

export default CameraPlotElementContextMenu;
