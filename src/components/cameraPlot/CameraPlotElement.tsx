
import React, { useState, useRef, useEffect } from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface CameraPlotElementProps {
  element: CameraElement;
  isSelected: boolean;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
  onDelete: (elementId: string) => void;
  onSelect: (elementId: string, multiSelect?: boolean) => void;
}

const CameraPlotElement = ({ element, isSelected, onUpdate, onDelete, onSelect }: CameraPlotElementProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLabelDragging, setIsLabelDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(element.label);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [isScaling, setIsScaling] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elementX: 0, elementY: 0, initialScale: 1, initialRotation: 0 });
  const [cursorType, setCursorType] = useState('move');
  
  const elementRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const edgeThreshold = 10;
    
    // Check if near edges for scaling/rotation
    const nearEdge = relativeX < edgeThreshold || relativeX > rect.width - edgeThreshold || 
                    relativeY < edgeThreshold || relativeY > rect.height - edgeThreshold;
    
    if (nearEdge && isSelected) {
      setIsRotating(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        elementX: element.x,
        elementY: element.y,
        initialScale: element.scale || 1,
        initialRotation: element.rotation || 0
      });
    } else {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        elementX: element.x,
        elementY: element.y,
        initialScale: element.scale || 1,
        initialRotation: element.rotation || 0
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelected) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const relativeY = e.clientY - rect.top;
    const edgeThreshold = 10;
    
    const nearEdge = relativeX < edgeThreshold || relativeX > rect.width - edgeThreshold || 
                    relativeY < edgeThreshold || relativeY > rect.height - edgeThreshold;
    
    setCursorType(nearEdge ? 'grab' : 'move');
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
      initialRotation: element.rotation || 0
    });
  };

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        onUpdate(element.id, {
          x: dragStart.elementX + deltaX,
          y: dragStart.elementY + deltaY
        });
      } else if (isLabelDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        onUpdate(element.id, {
          labelOffsetX: dragStart.elementX + deltaX,
          labelOffsetY: dragStart.elementY + deltaY
        });
      } else if (isRotating) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        // Calculate rotation
        const centerX = element.x + element.width / 2;
        const centerY = element.y + element.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        
        // Calculate scale based on distance from center
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const scaleChange = distance / 100;
        const newScale = Math.max(0.1, Math.min(3, dragStart.initialScale + scaleChange * (deltaX > 0 ? 1 : -1)));
        
        onUpdate(element.id, {
          rotation: angle,
          scale: newScale
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsLabelDragging(false);
      setIsScaling(false);
      setIsRotating(false);
    };

    if (isDragging || isLabelDragging || isScaling || isRotating) {
      document.addEventListener('mousemove', handleMouseMoveGlobal);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveGlobal);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isLabelDragging, isScaling, isRotating, dragStart, element.id, element.x, element.y, element.width, element.height, onUpdate]);

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
    }
  };

  const duplicate = () => {
    // This will be handled by the parent component
    setShowContextMenu(false);
  };

  const handleDelete = () => {
    onDelete(element.id);
    setShowContextMenu(false);
  };

  // Calculate label position
  const labelX = element.x + element.width / 2 + (element.labelOffsetX || 0);
  const labelY = element.y + element.height + 10 + (element.labelOffsetY || 0);

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
            className="flex items-center justify-center text-white font-bold border-2 border-gray-400 bg-gray-700"
            style={style}
          >
            <img 
              src="/lovable-uploads/03e30ecb-e3df-45bd-917f-47a6684bfae6.png" 
              alt="Camera" 
              className="w-full h-full object-contain"
            />
          </div>
        );
      case 'person':
        return (
          <div 
            className="flex items-center justify-center text-white border-2 border-gray-400 bg-gray-700"
            style={style}
          >
            <img 
              src="/lovable-uploads/e28a970b-a037-42d0-a0c9-5b03fb007b14.png" 
              alt="Person" 
              className="w-full h-full object-contain"
            />
          </div>
        );
      case 'wall':
        return (
          <div 
            className="bg-gray-800 border-t-2 border-gray-700"
            style={{ 
              width: '100%',
              height: '100%',
              transform: `rotate(${rotation}deg) scale(${scale})`
            }}
          />
        );
      case 'furniture':
        if (element.label.includes('Round') || element.label.includes('Circle')) {
          return (
            <div 
              className="rounded-full border-2 border-gray-400 bg-gray-700"
              style={style}
            />
          );
        }
        return (
          <div 
            className="border-2 border-gray-400 bg-gray-700"
            style={style}
          />
        );
      default:
        return (
          <div 
            className="border-2 border-gray-400 bg-gray-700"
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
        className={`absolute ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          cursor: cursorType,
          zIndex: 2
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
      >
        {renderElement()}
        
        {/* Selection handles */}
        {isSelected && (
          <>
            {/* Corner handles for rotation/scaling */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 cursor-grab" />
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 cursor-grab" />
            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 cursor-grab" />
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 cursor-grab" />
          </>
        )}
      </div>

      {/* Label */}
      <div
        className="absolute cursor-move text-sm text-white bg-black bg-opacity-50 px-1 rounded"
        style={{
          left: labelX - 20,
          top: labelY,
          zIndex: 3
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
            className="bg-white text-black px-1 text-sm min-w-12"
          />
        ) : (
          element.label
        )}
      </div>

      {/* Context menu */}
      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowContextMenu(false)}
          />
          <div
            className="fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            <button
              className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700"
              onClick={duplicate}
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
      )}
    </>
  );
};

export default CameraPlotElement;
