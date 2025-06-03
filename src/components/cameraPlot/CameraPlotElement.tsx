
import React, { useState, useRef, useEffect } from 'react';
import { Camera, User } from 'lucide-react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface CameraPlotElementProps {
  element: CameraElement;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onUpdate: (updates: Partial<CameraElement>) => void;
  onDelete: () => void;
}

const CameraPlotElement = ({ 
  element, 
  isSelected, 
  onMouseDown, 
  onUpdate, 
  onDelete 
}: CameraPlotElementProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [labelText, setLabelText] = useState(element.label);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLabelText(element.label);
  }, [element.label]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleLabelDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleLabelSubmit = () => {
    onUpdate({ label: labelText });
    setIsEditing(false);
  };

  const handleLabelKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLabelSubmit();
    } else if (e.key === 'Escape') {
      setLabelText(element.label);
      setIsEditing(false);
    }
  };

  const handleDuplicate = () => {
    // This would need to be handled at a higher level
    setShowContextMenu(false);
  };

  const handleDelete = () => {
    onDelete();
    setShowContextMenu(false);
  };

  const renderElementShape = () => {
    const style = {
      width: element.width,
      height: element.height,
      backgroundColor: element.color || '#3B82F6',
      transform: `rotate(${element.rotation}deg)`,
    };

    switch (element.type) {
      case 'camera':
        return (
          <div
            className="flex items-center justify-center text-white rounded border-2 border-gray-800"
            style={style}
          >
            <Camera className="h-4 w-4" />
          </div>
        );
      case 'person':
        return (
          <div
            className="flex items-center justify-center text-white rounded-full border-2 border-gray-800"
            style={style}
          >
            <User className="h-3 w-3" />
          </div>
        );
      case 'wall':
        return (
          <div
            className="bg-gray-600 border border-gray-800"
            style={style}
          />
        );
      case 'furniture':
        return (
          <div
            className={`border-2 border-gray-800 ${
              element.width === element.height ? 'rounded-full' : 'rounded'
            }`}
            style={style}
          />
        );
      default:
        return (
          <div
            className="bg-gray-400 border border-gray-800 rounded"
            style={style}
          />
        );
    }
  };

  // Calculate label position
  const labelX = element.labelX ?? element.x + element.width + 5;
  const labelY = element.labelY ?? element.y;
  
  // Show connection line if label is far from element
  const distance = Math.sqrt(
    Math.pow(labelX - (element.x + element.width / 2), 2) + 
    Math.pow(labelY - (element.y + element.height / 2), 2)
  );
  const showConnectionLine = distance > 60;

  return (
    <>
      {/* Element */}
      <div
        className={`absolute cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          left: element.x,
          top: element.y,
          zIndex: 10
        }}
        onMouseDown={onMouseDown}
        onContextMenu={handleContextMenu}
      >
        {renderElementShape()}
      </div>

      {/* Connection line */}
      {showConnectionLine && (
        <svg
          className="absolute pointer-events-none"
          style={{ zIndex: 5 }}
          width="100%"
          height="100%"
        >
          <line
            x1={element.x + element.width / 2}
            y1={element.y + element.height / 2}
            x2={labelX}
            y2={labelY + 10}
            stroke="#9CA3AF"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        </svg>
      )}

      {/* Label */}
      <div
        className="absolute text-xs font-medium text-gray-800 bg-white px-1 py-0.5 rounded border shadow-sm cursor-pointer"
        style={{
          left: labelX,
          top: labelY,
          zIndex: 15
        }}
        onDoubleClick={handleLabelDoubleClick}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={labelText}
            onChange={(e) => setLabelText(e.target.value)}
            onBlur={handleLabelSubmit}
            onKeyDown={handleLabelKeyPress}
            className="bg-transparent border-none outline-none text-xs w-16"
            autoFocus
          />
        ) : (
          element.label
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowContextMenu(false)}
          />
          <div
            className="absolute bg-white border border-gray-300 rounded shadow-lg py-1 z-30"
            style={{
              left: contextMenuPos.x,
              top: contextMenuPos.y
            }}
          >
            <button
              className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100"
              onClick={handleDuplicate}
            >
              Duplicate
            </button>
            <button
              className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 text-red-600"
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
