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

  // Calculate label position with different default distances per type
  const getDefaultOffset = () => {
    switch (element.type) {
      case 'camera':
        return 5; // Close for cameras
      case 'person':
        return 5; // Close for people
      case 'furniture':
        return 20; // Much closer for furniture (was 80)
      case 'wall':
        return -15; // Just above walls
      default:
        return 5;
    }
  };

  // Get threshold for when lines should appear - type-specific
  const getLineThreshold = () => {
    switch (element.type) {
      case 'furniture':
        return 35; // Lower threshold for furniture (was 100)
      case 'camera':
      case 'person':
        return 25; // Lower threshold for cameras and people
      default:
        return 25;
    }
  };

  const labelOffsetX = typeof element.labelOffsetX === 'number' ? element.labelOffsetX : 0;
  const labelOffsetY = typeof element.labelOffsetY === 'number' ? element.labelOffsetY : getDefaultOffset();
  const labelX = elementX + elementWidth / 2 + labelOffsetX;
  const labelY = elementY + elementHeight + labelOffsetY;

  // Calculate center points
  const elementCenterX = elementX + elementWidth / 2;
  const elementCenterY = elementY + elementHeight / 2;
  const labelCenterX = labelX;
  const labelCenterY = labelY;

  // Calculate distance between element center and label center
  const distance = Math.sqrt(
    Math.pow(elementCenterX - labelCenterX, 2) + 
    Math.pow(elementCenterY - labelCenterY, 2)
  );

  // Show line if distance exceeds threshold
  const threshold = getLineThreshold();
  const showLine = distance > threshold;

  // Calculate line start and end points with consistent padding
  let lineStartX = elementCenterX;
  let lineStartY = elementCenterY;
  let lineEndX = labelCenterX;
  let lineEndY = labelCenterY;

  if (showLine) {
    // Calculate direction vector
    const dirX = (labelCenterX - elementCenterX) / distance;
    const dirY = (labelCenterY - elementCenterY) / distance;
    
    // Smart element padding based on actual element dimensions and position
    const elementHalfWidth = elementWidth / 2;
    const elementHalfHeight = elementHeight / 2;
    
    // Calculate intersection point with element rectangle
    const absX = Math.abs(dirX);
    const absY = Math.abs(dirY);
    
    let elementPadding;
    if (absX > absY) {
      // More horizontal direction
      elementPadding = elementHalfWidth / absX + 4;
    } else {
      // More vertical direction  
      elementPadding = elementHalfHeight / absY + 4;
    }
    
    lineStartX = elementCenterX + dirX * elementPadding;
    lineStartY = elementCenterY + dirY * elementPadding;
    
    // Consistent label padding
    const labelPadding = 12;
    lineEndX = labelCenterX - dirX * labelPadding;
    lineEndY = labelCenterY - dirY * labelPadding;
  }

  return (
    <>
      {/* Dotted line - only show if label is not hidden */}
      {showLine && !element.labelHidden && (
        <svg
          className="absolute pointer-events-none"
          style={{
            left: Math.min(lineStartX, lineEndX) - 1,
            top: Math.min(lineStartY, lineEndY) - 1,
            width: Math.abs(lineEndX - lineStartX) + 2,
            height: Math.abs(lineEndY - lineStartY) + 2,
            zIndex: 5
          }}
        >
          <line
            x1={lineStartX - Math.min(lineStartX, lineEndX) + 1}
            y1={lineStartY - Math.min(lineStartY, lineEndY) + 1}
            x2={lineEndX - Math.min(lineStartX, lineEndX) + 1}
            y2={lineEndY - Math.min(lineStartY, lineEndY) + 1}
            stroke="#6b7280"
            strokeWidth="1"
            strokeDasharray="3,2"
          />
        </svg>
      )}

      {/* Label - only show if not hidden */}
      {!element.labelHidden && (
        <div
          className={`absolute inline-block px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded border select-none ${
            isSelected ? 'border-blue-400' : 'border-gray-600'
          }`}
          style={{
            left: labelX,
            top: labelY,
            cursor: 'move',
            whiteSpace: 'nowrap',
            pointerEvents: 'auto',
            zIndex: 10
          }}
          onMouseDown={onMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit}
              onKeyPress={handleKeyPress}
              className="bg-transparent text-white outline-none min-w-16"
              style={{ fontSize: '12px' }}
              autoFocus
            />
          ) : (
            element.label || `${element.type.charAt(0).toUpperCase()}${element.type.slice(1)} ${element.id.slice(0, 4)}`
          )}
        </div>
      )}
    </>
  );
};

export default CameraPlotElementLabel;
