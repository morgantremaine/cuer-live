
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
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elementX: 0, elementY: 0 });
  
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
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elementX: element.x,
      elementY: element.y
    });
  };

  const handleLabelMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLabelDragging(true);
    const labelX = element.labelX || element.x + element.width / 2;
    const labelY = element.labelY || element.y + element.height + 10;
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elementX: labelX,
      elementY: labelY
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elementX: element.width,
      elementY: element.height
    });
  };

  const handleRotateMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elementX: element.rotation,
      elementY: 0
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
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
          labelX: dragStart.elementX + deltaX,
          labelY: dragStart.elementY + deltaY
        });
      } else if (isResizing) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const newWidth = Math.max(20, dragStart.elementX + deltaX);
        const newHeight = Math.max(20, dragStart.elementY + deltaY);
        onUpdate(element.id, {
          width: newWidth,
          height: newHeight
        });
      } else if (isRotating) {
        const deltaX = e.clientX - dragStart.x;
        const newRotation = dragStart.elementX + deltaX;
        onUpdate(element.id, {
          rotation: newRotation
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsLabelDragging(false);
      setIsResizing(false);
      setIsRotating(false);
    };

    if (isDragging || isLabelDragging || isResizing || isRotating) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isLabelDragging, isResizing, isRotating, dragStart, element.id, onUpdate]);

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

  const handleColorChange = (color: string) => {
    onUpdate(element.id, { color });
  };

  // Calculate label position
  const labelX = element.labelX || element.x + element.width / 2;
  const labelY = element.labelY || element.y + element.height + 10;

  // Check if label is far from element (show connection line)
  const labelDistance = Math.sqrt(
    Math.pow(labelX - (element.x + element.width / 2), 2) + 
    Math.pow(labelY - (element.y + element.height / 2), 2)
  );
  const showConnectionLine = labelDistance > 60;

  const renderElement = () => {
    const style = {
      transform: `rotate(${element.rotation}deg)`,
      backgroundColor: element.color || '#6B7280'
    };

    switch (element.type) {
      case 'camera':
        return (
          <div 
            className="flex items-center justify-center text-white font-bold border-2 border-gray-400"
            style={style}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6h2l2-2h8l2 2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
          </div>
        );
      case 'person':
        return (
          <div 
            className="rounded-full flex items-center justify-center text-white border-2 border-gray-400"
            style={style}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        );
      case 'wall':
        return (
          <div 
            className="border-t-4 border-gray-400"
            style={{ 
              width: '100%',
              backgroundColor: element.color || '#6B7280',
              height: '4px',
              transform: `rotate(${element.rotation}deg)`
            }}
          />
        );
      case 'furniture':
        if (element.label.includes('Round') || element.label.includes('Circle')) {
          return (
            <div 
              className="rounded-full border-2 border-gray-400"
              style={style}
            />
          );
        }
        return (
          <div 
            className="border-2 border-gray-400"
            style={style}
          />
        );
      default:
        return (
          <div 
            className="border-2 border-gray-400"
            style={style}
          />
        );
    }
  };

  return (
    <>
      {/* Connection line */}
      {showConnectionLine && (
        <svg 
          className="absolute inset-0 pointer-events-none" 
          style={{ width: '100%', height: '100%', zIndex: 1 }}
        >
          <line
            x1={element.x + element.width / 2}
            y1={element.y + element.height / 2}
            x2={labelX}
            y2={labelY}
            stroke="#9CA3AF"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        </svg>
      )}

      {/* Main element */}
      <div
        ref={elementRef}
        className={`absolute cursor-move ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          zIndex: 2
        }}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        {renderElement()}
        
        {/* Selection handles */}
        {isSelected && (
          <>
            {/* Resize handle */}
            <div
              className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 cursor-se-resize"
              onMouseDown={handleResizeMouseDown}
            />
            {/* Rotation handle */}
            <div
              className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-green-500 rounded-full cursor-grab"
              onMouseDown={handleRotateMouseDown}
            />
            {/* Color picker */}
            <div className="absolute -top-8 -right-1 flex gap-1">
              {['#6B7280', '#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'].map(color => (
                <button
                  key={color}
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                />
              ))}
            </div>
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
