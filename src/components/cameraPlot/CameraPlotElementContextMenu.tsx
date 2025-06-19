
import React from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';
import ColorPicker from '@/components/ColorPicker';
import { useColorPicker } from '@/hooks/useColorPicker';

interface CameraPlotElementContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  element: CameraElement;
  onClose: () => void;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
  onDelete: (elementId: string) => void;
  onDuplicate?: (elementId: string) => void;
  allElements?: CameraElement[];
}

const CameraPlotElementContextMenu = ({ 
  isVisible, 
  position, 
  element, 
  onClose, 
  onUpdate, 
  onDelete,
  onDuplicate,
  allElements = []
}: CameraPlotElementContextMenuProps) => {
  const {
    showColorPicker,
    handleToggleColorPicker,
    handleColorSelect
  } = useColorPicker();

  if (!isVisible) return null;

  const handleDuplicate = () => {
    console.log('Duplicate button clicked for element:', element.id);
    
    if (onDuplicate) {
      onDuplicate(element.id);
    } else {
      console.error('onDuplicate callback not provided');
    }
    onClose();
  };

  const handleDelete = () => {
    onDelete(element.id);
    onClose();
  };

  const handleColorChange = (elementId: string, color: string) => {
    onUpdate(elementId, { color });
    handleColorSelect(elementId, color);
  };

  const isFurniture = element.type === 'furniture';

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      />
      <div
        className="fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50 min-w-32"
        style={{ left: position.x, top: position.y }}
      >
        <button
          className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700"
          onClick={handleDuplicate}
        >
          Duplicate
        </button>
        
        {isFurniture && (
          <div className="px-4 py-2 border-t border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">Color</span>
              <ColorPicker
                itemId={element.id}
                showColorPicker={showColorPicker}
                onToggle={handleToggleColorPicker}
                onColorSelect={handleColorChange}
              />
            </div>
          </div>
        )}
        
        <button
          className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700 border-t border-gray-600"
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
    </>
  );
};

export default CameraPlotElementContextMenu;
