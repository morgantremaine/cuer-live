
import React, { useState, useRef, useEffect } from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface CameraPlotElementLabelProps {
  element: CameraElement;
  isSelected: boolean;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
  onMouseDown: (e: React.MouseEvent) => void;
}

const CameraPlotElementLabel = ({ element, isSelected, onUpdate, onMouseDown }: CameraPlotElementLabelProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(element.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(element.label);
  }, [element.label]);

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

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  if (!element.label) return null;

  // Calculate label position - perfectly centered below the element
  const labelX = element.x + element.width / 2 + (element.labelOffsetX || 0);
  const labelY = element.y + element.height + (element.labelOffsetY || 10); // Use a smaller default offset

  return (
    <div
      className={`absolute text-sm text-white bg-black bg-opacity-75 px-2 py-1 rounded pointer-events-auto cursor-move ${
        isSelected ? 'z-10' : 'z-5'
      }`}
      style={{
        left: labelX,
        top: labelY,
        transform: 'translateX(-50%)', // This centers the label horizontally
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={handleDoubleClick}
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
  );
};

export default CameraPlotElementLabel;
