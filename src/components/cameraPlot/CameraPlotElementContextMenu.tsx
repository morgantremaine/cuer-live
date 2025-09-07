
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
    if (onDuplicate) {
      onDuplicate(element.id);
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
    onClose();
  };

  const isFurniture = element.type === 'furniture';
  const isPerson = element.type === 'person';

  const handlePersonColorChange = (color: 'blue' | 'green' | 'red' | 'yellow') => {
    onUpdate(element.id, { personColor: color });
    onClose();
  };

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
        
        <button
          className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700 border-t border-gray-600"
          onClick={() => {
            onUpdate(element.id, { labelHidden: !element.labelHidden });
            onClose();
          }}
        >
          {element.labelHidden ? 'Show Label' : 'Hide Label'}
        </button>
        
        {isPerson && (
          <div className="px-4 py-2 border-t border-gray-600">
            <div className="mb-2">
              <span className="text-white text-sm">Color</span>
            </div>
            <div className="flex gap-2">
              {(['blue', 'green', 'red', 'yellow'] as const).map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full border-2 ${
                    element.personColor === color || (!element.personColor && color === 'blue')
                      ? 'border-white' 
                      : 'border-gray-400'
                  }`}
                  style={{ 
                    backgroundColor: color === 'blue' ? '#3b82f6' : 
                                   color === 'green' ? '#22c55e' : 
                                   color === 'red' ? '#ef4444' : '#eab308' 
                  }}
                  onClick={() => handlePersonColorChange(color)}
                />
              ))}
            </div>
          </div>
        )}
        
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
