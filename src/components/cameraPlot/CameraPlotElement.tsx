
import React, { useState, useRef, useEffect } from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface CameraPlotElementProps {
  element: CameraElement;
  isSelected: boolean;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
  onDelete: (elementId: string) => void;
  onSelect: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

const CameraPlotElement = ({ element, isSelected, onUpdate, onDelete, onSelect, snapToGrid }: CameraPlotElementProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [isLabelDragging, setIsLabelDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(element.label);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ 
    x: 0, 
    y: 0, 
    elementX: 0, 
    elementY: 0, 
    initialScale: 1, 
    initialRotation: 0,
    centerX: 0,
    centerY: 0
  });
  
  const elementRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if element can be scaled (cameras and people cannot be scaled)
  const canScale = element.type !== 'camera' && element.type !== 'person';

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.detail === 2) { // Double click
      setIsEditing(true);
      return;
    }

    onSelect(element.id, e.ctrlKey || e.metaKey);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const relativeY = e.clientY - rect.top;
    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;
    
    // Check if clicking on rotation handle (outer edge)
    const edgeThreshold = 15;
    const nearEdge = relativeX < edgeThreshold || relativeX > rect.width - edgeThreshold || 
                    relativeY < edgeThreshold || relativeY > rect.height - edgeThreshold;
    
    // Check if clicking on scale handle (corners) - only for scalable elements
    const cornerThreshold = 8;
    const nearCorner = canScale && isSelected && (
      (relativeX < cornerThreshold && relativeY < cornerThreshold) ||
      (relativeX > rect.width - cornerThreshold && relativeY < cornerThreshold) ||
      (relativeX < cornerThreshold && relativeY > rect.height - cornerThreshold) ||
      (relativeX > rect.width - cornerThreshold && relativeY > rect.height - cornerThreshold)
    );

    if (nearCorner) {
      // Scale mode
      setIsScaling(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        elementX: element.x,
        elementY: element.y,
        initialScale: element.scale || 1,
        initialRotation: element.rotation || 0,
        centerX,
        centerY
      });
    } else if (nearEdge && isSelected) {
      // Rotation mode
      setIsRotating(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        elementX: element.x,
        elementY: element.y,
        initialScale: element.scale || 1,
        initialRotation: element.rotation || 0,
        centerX,
        centerY
      });
    } else {
      // Drag mode
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        elementX: element.x,
        elementY: element.y,
        initialScale: element.scale || 1,
        initialRotation: element.rotation || 0,
        centerX,
        centerY
      });
    }
  };

  const handleLabelMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLabelDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elementX: element.labelOffsetX || 0,
      elementY: element.labelOffsetY || 0,
      initialScale: element.scale || 1,
      initialRotation: element.rotation || 0,
      centerX: 0,
      centerY: 0
    });
  };

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const newPos = snapToGrid(dragStart.elementX + deltaX, dragStart.elementY + deltaY);
        onUpdate(element.id, {
          x: newPos.x,
          y: newPos.y
        });
      } else if (isLabelDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        onUpdate(element.id, {
          labelOffsetX: dragStart.elementX + deltaX,
          labelOffsetY: dragStart.elementY + deltaY
        });
      } else if (isRotating) {
        const centerX = element.x + element.width / 2;
        const centerY = element.y + element.height / 2;
        
        // Calculate rotation based on mouse position relative to center
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        
        onUpdate(element.id, {
          rotation: angle
        });
      } else if (isScaling && canScale) {
        const centerX = element.x + element.width / 2;
        const centerY = element.y + element.height / 2;
        
        // Calculate scale based on distance from center
        const currentDistance = Math.sqrt(
          Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
        );
        const initialDistance = Math.sqrt(
          Math.pow(dragStart.x - centerX, 2) + Math.pow(dragStart.y - centerY, 2)
        );
        
        if (initialDistance > 0) {
          const scaleMultiplier = currentDistance / initialDistance;
          const newScale = Math.max(0.3, Math.min(3, dragStart.initialScale * scaleMultiplier));
          
          onUpdate(element.id, {
            scale: newScale
          });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsLabelDragging(false);
      setIsRotating(false);
      setIsScaling(false);
    };

    if (isDragging || isLabelDragging || isRotating || isScaling) {
      document.addEventListener('mousemove', handleMouseMoveGlobal);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveGlobal);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isLabelDragging, isRotating, isScaling, dragStart, element, onUpdate, snapToGrid, canScale]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleEditSubmit = () => {
    onUpdate(element.id, { label: editValue });
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setEditValue(element.label);
      setIsEditing(false);
    } else if (e.key === 'Delete' && isSelected) {
      onDelete(element.id);
    }
  };

  const getCursor = () => {
    if (isDragging) return 'grabbing';
    if (isRotating) return 'crosshair';
    if (isScaling) return 'nw-resize';
    return 'grab';
  };

  // Calculate label position (relative to element)
  const labelX = element.x + element.width / 2 + (element.labelOffsetX || 0);
  const labelY = element.y + element.height + (element.labelOffsetY || 0);

  const renderElement = () => {
    const scale = element.scale || 1;
    const rotation = element.rotation || 0;
    
    const style = {
      transform: `rotate(${rotation}deg) scale(${scale})`,
      transformOrigin: 'center'
    };

    switch (element.type) {
      case 'camera':
        return (
          <div 
            className="flex items-center justify-center border-2 border-blue-500 bg-white rounded-full"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center'
            }}
          >
            {/* Camera circle with direction indicator */}
            <svg viewBox="0 0 24 24" className="w-full h-full p-1">
              <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="white" strokeWidth="1"/>
              <path d="M12 7 L17 12 L12 17" fill="white" stroke="white" strokeWidth="1"/>
            </svg>
          </div>
        );
      case 'person':
        return (
          <div 
            className="flex items-center justify-center border-2 border-green-500 bg-white rounded-full"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center'
            }}
          >
            {/* Person circle with direction line */}
            <svg viewBox="0 0 24 24" className="w-full h-full p-1">
              <circle cx="12" cy="12" r="10" fill="#10b981" stroke="white" strokeWidth="1"/>
              <line x1="12" y1="12" x2="12" y2="4" stroke="white" strokeWidth="2"/>
            </svg>
          </div>
        );
      case 'wall':
        return (
          <div 
            className="bg-gray-800 border border-gray-700"
            style={{ 
              width: '100%',
              height: '100%',
              transform: `rotate(${rotation}deg) scale(${scale})`
            }}
          />
        );
      case 'furniture':
        if (element.label.toLowerCase().includes('round') || element.label.toLowerCase().includes('circle')) {
          return (
            <div 
              className="rounded-full border-2 border-gray-400 bg-amber-100"
              style={style}
            />
          );
        }
        return (
          <div 
            className="border-2 border-gray-400 bg-amber-100"
            style={style}
          />
        );
      default:
        return (
          <div 
            className="border-2 border-gray-400 bg-gray-300"
            style={style}
          />
        );
    }
  };

  return (
    <>
      {/* Main element */}
      <div
        ref={elementRef}
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
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        tabIndex={0}
        onKeyDown={handleKeyPress}
      >
        {renderElement()}
        
        {/* Selection handles */}
        {isSelected && (
          <>
            {/* Rotation handles (edges) */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-500 border border-white cursor-crosshair rounded-full" />
            <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-yellow-500 border border-white cursor-crosshair rounded-full" />
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-500 border border-white cursor-crosshair rounded-full" />
            <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-yellow-500 border border-white cursor-crosshair rounded-full" />
            
            {/* Scale handles (corners) - only for scalable elements */}
            {canScale && (
              <>
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 border border-white cursor-nw-resize" />
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 border border-white cursor-ne-resize" />
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 border border-white cursor-sw-resize" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border border-white cursor-se-resize" />
              </>
            )}
          </>
        )}
      </div>

      {/* Label */}
      {element.label && (
        <div
          className={`absolute text-sm text-white bg-black bg-opacity-75 px-2 py-1 rounded pointer-events-auto cursor-move ${
            isSelected ? 'z-10' : 'z-5'
          }`}
          style={{
            left: labelX - 20,
            top: labelY,
          }}
          onMouseDown={handleLabelMouseDown}
          onDoubleClick={() => setIsEditing(true)}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit}
              onKeyDown={handleKeyPress}
              className="bg-white text-black px-1 text-sm min-w-16 rounded"
            />
          ) : (
            element.label
          )}
        </div>
      )}

      {/* Context menu */}
      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setShowContextMenu(false)}
          />
          <div
            className="fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            <button
              className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700"
              onClick={() => {
                onUpdate(element.id, {
                  id: `element-${Date.now()}`,
                  x: element.x + 20,
                  y: element.y + 20
                });
                setShowContextMenu(false);
              }}
            >
              Duplicate
            </button>
            <button
              className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700"
              onClick={() => {
                onDelete(element.id);
                setShowContextMenu(false);
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default CameraPlotElement;
