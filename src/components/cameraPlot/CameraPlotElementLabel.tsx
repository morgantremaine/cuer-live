
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

  // Calculate label position - much closer to the element
  const getDefaultOffset = () => {
    switch (element.type) {
      case 'camera':
        return 2; // Very close for cameras
      case 'person':
        return 2; // Very close for people
      case 'furniture':
        return 2; // Very close for furniture
      case 'wall':
        return -15; // Just above walls
      default:
        return 2;
    }
  };

  const labelOffsetX = element.labelOffsetX || 0;
  const labelOffsetY = element.labelOffsetY || getDefaultOffset();
  const labelX = element.x + element.width / 2 + labelOffsetX;
  const labelY = element.y + element.height + labelOffsetY;

  // Determine if we need a dotted line (when label is moved away from default position)
  const needsDottedLine = Math.abs(labelOffsetX) > 10 || Math.abs(labelOffsetY - getDefaultOffset()) > 10;
  
  // Calculate line from element center to label with increased padding
  const elementCenterX = element.x + element.width / 2;
  const elementCenterY = element.y + element.height / 2;
  
  // Increased padding to create more space between line and icon/label - increased icon padding more
  const iconPadding = 30; // Increased from 20 to 30 for more space from icon
  const labelPadding = 15; // Keep existing space from label
  const dx = labelX - elementCenterX;
  const dy = labelY - elementCenterY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Calculate padded endpoints
  const unitX = dx / distance;
  const unitY = dy / distance;
  
  const lineStartX = elementCenterX + unitX * iconPadding;
  const lineStartY = elementCenterY + unitY * iconPadding;
  const lineEndX = labelX - unitX * labelPadding;
  const lineEndY = labelY - unitY * labelPadding;

  return (
    <>
      {/* Dotted line connection with increased padding */}
      {needsDottedLine && (
        <svg 
          className="absolute pointer-events-none"
          style={{ 
            left: 0, 
            top: 0, 
            width: '100%', 
            height: '100%',
            zIndex: 1
          }}
        >
          <line
            x1={lineStartX}
            y1={lineStartY}
            x2={lineEndX}
            y2={lineEndY}
            stroke="white"
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity="0.7"
          />
        </svg>
      )}
      
      {/* Label */}
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
    </>
  );
};

export default CameraPlotElementLabel;
