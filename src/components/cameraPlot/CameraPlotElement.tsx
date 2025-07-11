
import React, { useState, useRef, useCallback } from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';
import { useDraggable } from '@dnd-kit/core';

interface CameraPlotElementProps {
  element: CameraElement;
  isSelected: boolean;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
  onDelete: (elementId: string) => void;
  onDuplicate?: (elementId: string) => void;
  onSelect: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  allElements: CameraElement[];
  selectedElements: CameraElement[];
  zoom: number;
  pan: { x: number; y: number };
}

const CameraPlotElement: React.FC<CameraPlotElementProps> = ({
  element,
  isSelected,
  onUpdate,
  onDelete,
  onDuplicate,
  onSelect,
  snapToGrid,
  zoom,
  pan
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(element.label || '');

  const handleSelect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const multiSelect = e.ctrlKey || e.metaKey;
    onSelect(element.id, multiSelect);
  }, [element.id, onSelect]);

  const handleLabelEdit = useCallback(() => {
    setEditingLabel(true);
    setLabelValue(element.label || '');
  }, [element.label]);

  const handleLabelSave = useCallback(() => {
    onUpdate(element.id, { label: labelValue });
    setEditingLabel(false);
  }, [element.id, labelValue, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLabelSave();
    } else if (e.key === 'Escape') {
      setEditingLabel(false);
      setLabelValue(element.label || '');
    }
  }, [handleLabelSave, element.label]);

  // Special rendering for wall elements
  if (element.type === 'wall' && element.endX !== undefined && element.endY !== undefined) {
    return (
      <svg
        className="absolute pointer-events-none"
        style={{
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          zIndex: 10
        }}
      >
        <line
          x1={element.startX || element.x}
          y1={element.startY || element.y}
          x2={element.endX}
          y2={element.endY}
          stroke={isSelected ? "#3b82f6" : "#000000"}
          strokeWidth={isSelected ? 6 : 4}
          strokeLinecap="round"
          className="pointer-events-auto cursor-pointer"
          onClick={handleSelect}
        />
        
        {/* Selection indicators */}
        {isSelected && (
          <>
            <circle
              cx={element.startX || element.x}
              cy={element.startY || element.y}
              r="4"
              fill="#3b82f6"
              className="pointer-events-auto cursor-pointer"
            />
            <circle
              cx={element.endX}
              cy={element.endY}
              r="4"
              fill="#3b82f6"
              className="pointer-events-auto cursor-pointer"
            />
          </>
        )}

        {/* Label for wall */}
        {element.label && (
          <text
            x={(element.startX || element.x + element.endX) / 2}
            y={(element.startY || element.y + element.endY) / 2 - 10}
            textAnchor="middle"
            className="text-xs fill-gray-700 pointer-events-none"
          >
            {element.label}
          </text>
        )}
      </svg>
    );
  }

  // Regular element rendering for non-wall elements
  const getElementStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      left: `${element.x}px`,
      top: `${element.y}px`,
      width: `${element.width}px`,
      height: `${element.height}px`,
      transform: `rotate(${element.rotation || 0}deg) scale(${element.scale || 1})`,
      transformOrigin: 'center',
      cursor: isDragging ? 'grabbing' : 'grab',
      zIndex: isSelected ? 20 : 10,
    };

    return baseStyle;
  };

  const getElementContent = () => {
    switch (element.type) {
      case 'camera':
        return (
          <div className={`w-full h-full rounded-lg flex items-center justify-center text-white text-xs font-bold border-2 ${
            isSelected ? 'bg-blue-600 border-blue-400' : 'bg-gray-700 border-gray-600'
          }`}>
            📹
          </div>
        );
      case 'light':
        return (
          <div className={`w-full h-full rounded-full flex items-center justify-center text-white text-xs font-bold border-2 ${
            isSelected ? 'bg-yellow-500 border-yellow-400' : 'bg-yellow-600 border-yellow-500'
          }`}>
            💡
          </div>
        );
      case 'person':
        return (
          <div className={`w-full h-full rounded-full flex items-center justify-center text-white text-xs font-bold border-2 ${
            isSelected ? 'bg-green-500 border-green-400' : 'bg-green-600 border-green-500'
          }`}>
            👤
          </div>
        );
      case 'prop':
        return (
          <div className={`w-full h-full rounded flex items-center justify-center text-white text-xs font-bold border-2 ${
            isSelected ? 'bg-purple-500 border-purple-400' : 'bg-purple-600 border-purple-500'
          }`}>
            📦
          </div>
        );
      case 'furniture':
        return (
          <div className={`w-full h-full rounded flex items-center justify-center text-white text-xs font-bold border-2 ${
            isSelected ? 'bg-brown-500 border-brown-400' : 'bg-brown-600 border-brown-500'
          }`}>
            🪑
          </div>
        );
      default:
        return (
          <div className={`w-full h-full rounded flex items-center justify-center text-white text-xs font-bold border-2 ${
            isSelected ? 'bg-gray-500 border-gray-400' : 'bg-gray-600 border-gray-500'
          }`}>
            ?
          </div>
        );
    }
  };

  return (
    <div
      style={getElementStyle()}
      onClick={handleSelect}
      className="select-none"
    >
      {getElementContent()}
      
      {/* Label */}
      {editingLabel ? (
        <input
          type="text"
          value={labelValue}
          onChange={(e) => setLabelValue(e.target.value)}
          onBlur={handleLabelSave}
          onKeyDown={handleKeyDown}
          className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 text-xs bg-white border rounded shadow-lg z-50"
          style={{ minWidth: '80px' }}
          autoFocus
        />
      ) : (
        element.label && (
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 text-xs bg-gray-900 text-white rounded shadow-lg cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleLabelEdit();
            }}
          >
            {element.label}
          </div>
        )
      )}
    </div>
  );
};

export default CameraPlotElement;
