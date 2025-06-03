
import React, { useState } from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';
import CameraPlotElementRenderer from './CameraPlotElementRenderer';
import CameraPlotElementLabel from './CameraPlotElementLabel';
import CameraPlotElementHandles from './CameraPlotElementHandles';
import CameraPlotElementContextMenu from './CameraPlotElementContextMenu';
import { useCameraPlotElementInteractions } from '@/hooks/cameraPlot/useCameraPlotElementInteractions';

interface CameraPlotElementProps {
  element: CameraElement;
  isSelected: boolean;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
  onDelete: (elementId: string) => void;
  onDuplicate?: (element: CameraElement) => void;
  onSelect: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  allElements?: CameraElement[];
}

const CameraPlotElement = ({ 
  element, 
  isSelected, 
  onUpdate, 
  onDelete, 
  onDuplicate,
  onSelect, 
  snapToGrid,
  allElements = []
}: CameraPlotElementProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const {
    handleMouseDown,
    handleLabelMouseDown,
    handleRotationStart,
    getCursor,
    isRotating,
    canRotate
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
    
    // Position context menu very close to the element
    setContextMenuPos({ 
      x: element.x + element.width + 5, 
      y: element.y 
    });
    setShowContextMenu(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' && isSelected) {
      onDelete(element.id);
    }
  };

  const handleDuplicateElement = (newElement: CameraElement) => {
    console.log('CameraPlotElement - handleDuplicateElement called with:', newElement);
    if (onDuplicate) {
      onDuplicate(newElement);
    } else {
      console.error('onDuplicate prop not provided to CameraPlotElement');
    }
  };

  return (
    <>
      {/* Main element - no selection highlighting */}
      <div
        data-element-id={element.id}
        className="absolute"
        style={{
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          cursor: getCursor()
        }}
        onMouseDown={handleElementMouseDown}
        onContextMenu={handleContextMenu}
        tabIndex={0}
        onKeyDown={handleKeyPress}
      >
        <CameraPlotElementRenderer element={element} />
        
        {/* Rotation handles - restored for cameras and persons */}
        <CameraPlotElementHandles
          element={element}
          isSelected={isSelected}
          onRotationStart={handleRotationStart}
          isRotating={isRotating}
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
        onDuplicate={handleDuplicateElement}
        allElements={allElements}
      />
    </>
  );
};

export default CameraPlotElement;
