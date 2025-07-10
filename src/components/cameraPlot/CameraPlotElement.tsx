
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
  onDuplicate?: (elementId: string) => void;
  onSelect: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  allElements?: CameraElement[];
  selectedElements?: CameraElement[];
  zoom?: number;
  pan?: { x: number; y: number };
}

const CameraPlotElement = ({ 
  element, 
  isSelected, 
  onUpdate, 
  onDelete, 
  onDuplicate,
  onSelect, 
  snapToGrid,
  allElements = [],
  selectedElements = [],
  zoom = 1,
  pan = { x: 0, y: 0 }
}: CameraPlotElementProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const {
    handleMouseDown,
    handleLabelMouseDown,
    handleRotationStart,
    handleScaleStart,
    getCursor,
    isRotating,
    isScaling,
    canRotate,
    canScale
  } = useCameraPlotElementInteractions({
    element,
    isSelected,
    selectedElements,
    onUpdate,
    onSelect,
    snapToGrid
  });

  console.log(`🔍 Element ${element.id} render:`, { 
    isSelected, 
    selectedElementsLength: selectedElements.length,
    selectedElementIds: selectedElements.map(el => el.id)
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
    
    // Debug: Log all the positioning data
    const elementRect = e.currentTarget.getBoundingClientRect();
    console.log('🐛 Context menu debug:', {
      elementRect,
      clientX: e.clientX,
      clientY: e.clientY,
      elementPos: { x: element.x, y: element.y },
      zoom,
      pan
    });
    
    // Use the mouse cursor position directly - this should always be accurate
    setContextMenuPos({ 
      x: e.clientX + 10, 
      y: e.clientY 
    });
    setShowContextMenu(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' && isSelected) {
      onDelete(element.id);
    }
  };

  const handleDuplicateElement = (elementId: string) => {
    console.log('CameraPlotElement - handleDuplicateElement called with elementId:', elementId);
    if (onDuplicate) {
      onDuplicate(elementId);
    } else {
      console.error('onDuplicate prop not provided to CameraPlotElement');
    }
  };

  const rotation = element.rotation || 0;

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
          cursor: getCursor(),
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center'
        }}
        onMouseDown={handleElementMouseDown}
        onContextMenu={handleContextMenu}
        tabIndex={0}
        onKeyDown={handleKeyPress}
      >
        <CameraPlotElementRenderer element={element} />
        
        {/* Handles - rotation for cameras/persons, scaling for furniture */}
        <CameraPlotElementHandles
          element={element}
          isSelected={isSelected}
          onRotationStart={handleRotationStart}
          onScaleStart={handleScaleStart}
          isRotating={isRotating}
          isScaling={isScaling}
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
