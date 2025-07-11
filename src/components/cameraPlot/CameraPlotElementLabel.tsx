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
        return 80; // Increased threshold for furniture - line appears when far away
      case 'camera':
        return 60; // Increased threshold for cameras
      case 'person':
        return 60; // Increased threshold for people  
      case 'wall':
        return 50; // Threshold for walls
      default:
        return 60;
    }
  };

  const labelOffsetX = typeof element.labelOffsetX === 'number' ? element.labelOffsetX : 0;
  const labelOffsetY = typeof element.labelOffsetY === 'number' ? element.labelOffsetY : getDefaultOffset();
  const labelX = elementX + elementWidth / 2 + labelOffsetX;
  const labelY = elementY + elementHeight + labelOffsetY;

  // Calculate center points
  const elementCenterX = elementX + elementWidth / 2;
  const elementCenterY = elementY + elementHeight / 2;
  
  // Calculate actual label center - accounting for label dimensions
  // Estimate label width based on text content (approximate: 8px per character + padding)
  const labelText = element.label || `${element.type.charAt(0).toUpperCase()}${element.type.slice(1)} ${element.id.slice(0, 4)}`;
  const estimatedLabelWidth = labelText.length * 7 + 16; // 7px per char + padding (px-2 = 8px each side)
  const estimatedLabelHeight = 24; // px-2 py-1 + text height
  
  const labelCenterX = labelX; // With translateX(-50%), labelX is already the center
  const labelCenterY = labelY + estimatedLabelHeight / 2; // Center by adding half height

  // Calculate distance between element center and label center
  const distance = Math.sqrt(
    Math.pow(elementCenterX - labelCenterX, 2) + 
    Math.pow(elementCenterY - labelCenterY, 2)
  );

  // Show line if distance exceeds threshold
  const threshold = getLineThreshold();
  const showLine = distance > threshold;

  // Calculate line start and end points with increased padding for more negative space
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
      // More horizontal direction - increased padding for more negative space
      elementPadding = elementHalfWidth / absX + 15; // Increased from 4 to 15
    } else {
      // More vertical direction - increased padding for more negative space
      elementPadding = elementHalfHeight / absY + 15; // Increased from 4 to 15
    }
    
    lineStartX = elementCenterX + dirX * elementPadding;
    lineStartY = elementCenterY + dirY * elementPadding;
    
    // Increased label padding for more negative space
    const labelPadding = 25; // Increased from 12 to 25
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
            zIndex: 10,
            transform: 'translateX(-50%)' // Center the label horizontally
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
