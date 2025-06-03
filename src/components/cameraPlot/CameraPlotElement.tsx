
import React, { useState } from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';
import CameraPlotElementRenderer from './CameraPlotElementRenderer';
import CameraPlotElementHandles from './CameraPlotElementHandles';
import CameraPlotElementLabel from './CameraPlotElementLabel';
import CameraPlotElementContextMenu from './CameraPlotElementContextMenu';
import { useCameraPlotElementInteractions } from '@/hooks/cameraPlot/useCameraPlotElementInteractions';

interface CameraPlotElementProps {
  element: CameraElement;
  isSelected: boolean;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
  onDelete: (elementId: string) => void;
  onSelect: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

const CameraPlotElement = ({ element, isSelected, onUpdate, onDelete, onSelect, snapToGrid }: CameraPlotElementProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const {
    handleMouseDown,
    handleLabelMouseDown,
    handleMouseMove,
    handleMouseLeave,
    getCursor,
    isInRotationZone,
    isInScaleZone
  } = useCameraPlotElementInteractions({
    element,
    isSelected,
    onUpdate,
    onSelect,
    snapToGrid
  });

  const handleElementMouseDown = (e: React.MouseEvent) => {
    const result = handleMouseDown(e);
    if (result?.isDoubleClick) {
      setIsEditing(true);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' && isSelected) {
      onDelete(element.id);
    }
  };

  return (
    <>
      {/* Main element */}
      <div
        data-element-id={element.id}
        className={`absolute ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-75' : ''} ${
          isSelected ? 'z-10' : 'z-5'
        }`}
        style={{
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          cursor: getCursor()
        }}
        onMouseDown={handleElementMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        tabIndex={0}
        onKeyDown={handleKeyPress}
      >
        <CameraPlotElementRenderer element={element} />
        <CameraPlotElementHandles 
          element={element} 
          isSelected={isSelected} 
          isInRotationZone={isInRotationZone}
          isInScaleZone={isInScaleZone}
        />
      </div>

      {/* Label */}
      <CameraPlotElementLabel
        element={element}
        isSelected={isSelected}
        onUpdate={onUpdate}
        onMouseDown={handleLabelMouseDown}
      />

      {/* Context menu */}
      <CameraPlotElementContextMenu
        isVisible={showContextMenu}
        position={contextMenuPos}
        element={element}
        onClose={() => setShowContextMenu(false)}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </>
  );
};

export default CameraPlotElement;
