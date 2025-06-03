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

  // Ensure all required values are numbers with safe defaults
  const elementX = typeof element.x === 'number' ? element.x : 0;
  const elementY = typeof element.y === 'number' ? element.y : 0;
  const elementWidth = typeof element.width === 'number' ? element.width : 40;
  const elementHeight = typeof element.height === 'number' ? element.height : 40;

  // Calculate label position with much further default distances
  const getDefaultOffset = () => {
    switch (element.type) {
      case 'camera':
        return 5; // Close for cameras
      case 'person':
        return 5; // Close for people
      case 'furniture':
        return 80; // Much further for furniture (increased from 50)
      case 'wall':
        return -15; // Just above walls
      default:
        return 5;
    }
  };

  const labelOffsetX = typeof element.labelOffsetX === 'number' ? element.labelOffsetX : 0;
  const labelOffsetY = typeof element.labelOffsetY === 'number' ? element.labelOffsetY : getDefaultOffset();
  const labelX = elementX + elementWidth / 2 + labelOffsetX;
  const labelY = elementY + elementHeight + labelOffsetY;

  // More strict logic for when dotted lines should appear
  // Only show lines when label is moved significantly away from default position
  const defaultOffsetY = getDefaultOffset();
  const distanceFromDefault = Math.sqrt(
    Math.pow(labelOffsetX, 2) + Math.pow(labelOffsetY - defaultOffsetY, 2)
  );
  
  // Increased threshold - lines only appear when label is moved more than 25 pixels from default
  const needsDottedLine = distanceFromDefault > 25;
  
  // Calculate line from element center to label with much larger padding for furniture
  const elementCenterX = elementX + elementWidth / 2;
  const elementCenterY = elementY + elementHeight / 2;
  
  // Much larger padding for furniture to keep lines far from icons
  const iconPadding = element.type === 'furniture' ? 80 : 30; // Increased furniture padding significantly
  const labelPadding = 15;
  const dx = labelX - elementCenterX;
  const dy = labelY - elementCenterY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Only calculate line coordinates if distance is valid and greater than 0
  let lineStartX = elementCenterX;
  let lineStartY = elementCenterY;
  let lineEndX = labelX;
  let lineEndY = labelY;
  
  if (distance > 0 && !isNaN(distance)) {
    // Calculate padded endpoints
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    lineStartX = elementCenterX + unitX * iconPadding;
    lineStartY = elementCenterY + unitY * iconPadding;
    lineEndX = labelX - unitX * labelPadding;
    lineEndY = labelY - unitY * labelPadding;
  }

  // Validate all line coordinates before rendering
  const isValidCoordinate = (coord: number) => typeof coord === 'number' && !isNaN(coord) && isFinite(coord);
  const canRenderLine = isValidCoordinate(lineStartX) && isValidCoordinate(lineStartY) && 
                       isValidCoordinate(lineEndX) && isValidCoordinate(lineEndY);

  return (
    <>
      {/* Dotted line connection with much larger padding for furniture and stricter appearance logic */}
      {needsDottedLine && canRenderLine && (
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
