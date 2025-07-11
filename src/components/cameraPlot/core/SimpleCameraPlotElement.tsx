import React, { useState } from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';
import { useSimpleElementDrag } from './SimpleElementDrag';

interface SimpleCameraPlotElementProps {
  element: CameraElement;
  isSelected: boolean;
  onUpdate: (elementId: string, updates: Partial<CameraElement>) => void;
  onDelete: (elementId: string) => void;
  onDuplicate?: (elementId: string) => void;
  onSelect: (elementId: string, multiSelect?: boolean) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  zoom: number;
  pan: { x: number; y: number };
}

const SimpleCameraPlotElement: React.FC<SimpleCameraPlotElementProps> = ({
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
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const { isDragging, startDrag } = useSimpleElementDrag({
    element,
    onUpdate,
    snapToGrid,
    zoom,
    pan
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(element.id, e.ctrlKey || e.metaKey);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Position context menu in screen coordinates
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const closeContextMenu = () => {
    setShowContextMenu(false);
  };

  const handleDelete = () => {
    onDelete(element.id);
    closeContextMenu();
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(element.id);
    }
    closeContextMenu();
  };

  // Get element styling based on type
  const getElementStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      left: element.x,
      top: element.y,
      transform: `rotate(${element.rotation || 0}deg)`,
      cursor: isDragging ? 'grabbing' : 'grab',
      userSelect: 'none' as const,
      pointerEvents: 'all' as const,
    };

    const size = 40;
    
    switch (element.type) {
      case 'camera':
        return {
          ...baseStyle,
          width: size,
          height: size,
          backgroundColor: '#3b82f6',
          border: isSelected ? '2px solid #fbbf24' : '2px solid #1e40af',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
        };
      
      case 'person':
        return {
          ...baseStyle,
          width: size,
          height: size,
          backgroundColor: '#10b981',
          border: isSelected ? '2px solid #fbbf24' : '2px solid #059669',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
        };
      
      case 'microphone':
        return {
          ...baseStyle,
          width: size,
          height: size,
          backgroundColor: '#8b5cf6',
          border: isSelected ? '2px solid #fbbf24' : '2px solid #7c3aed',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
        };
      
      default:
        return {
          ...baseStyle,
          width: size,
          height: size,
          backgroundColor: '#6b7280',
          border: isSelected ? '2px solid #fbbf24' : '2px solid #4b5563',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
        };
    }
  };

  const getElementContent = () => {
    switch (element.type) {
      case 'camera':
        return 'CAM';
      case 'person':
        return 'P';
      case 'microphone':
        return 'MIC';
      case 'furniture':
        return 'FUR';
      case 'wall':
        return 'WAL';
      default:
        return 'EL';
    }
  };

  return (
    <>
      <div
        style={getElementStyle()}
        onClick={handleClick}
        onMouseDown={startDrag}
        onContextMenu={handleContextMenu}
      >
        {getElementContent()}
        
        {/* Element label */}
        {element.label && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '2px',
              fontSize: '10px',
              whiteSpace: 'nowrap',
              marginTop: '2px',
              pointerEvents: 'none',
            }}
          >
            {element.label}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={closeContextMenu}
          />
          <div
            style={{
              position: 'fixed',
              left: contextMenuPos.x,
              top: contextMenuPos.y,
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              minWidth: '120px',
            }}
          >
            <button
              onClick={handleDuplicate}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                textAlign: 'left',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '14px',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              Duplicate
            </button>
            <button
              onClick={handleDelete}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                textAlign: 'left',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#ef4444',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = '#fef2f2';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
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

export default SimpleCameraPlotElement;