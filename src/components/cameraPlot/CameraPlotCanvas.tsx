
import React, { forwardRef, useState, useRef, useCallback } from 'react';
import { CameraElement, CameraPlotScene } from '@/hooks/useCameraPlot';
import CameraPlotElement from './CameraPlotElement';

interface CameraPlotCanvasProps {
  scene?: CameraPlotScene;
  selectedTool: string;
  selectedElements: string[];
  onAddElement: (element: Omit<CameraElement, 'id'>) => void;
  onUpdateElement: (elementId: string, updates: Partial<CameraElement>) => void;
  onDeleteElement: (elementId: string) => void;
  onSelectElement: (elementId: string) => void;
}

const CameraPlotCanvas = forwardRef<HTMLDivElement, CameraPlotCanvasProps>(({
  scene,
  selectedTool,
  selectedElements,
  onAddElement,
  onUpdateElement,
  onDeleteElement,
  onSelectElement
}, ref) => {
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (selectedTool === 'select') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let newElement: Omit<CameraElement, 'id'>;

    switch (selectedTool) {
      case 'camera':
        newElement = {
          type: 'camera',
          x,
          y,
          width: 40,
          height: 40,
          rotation: 0,
          label: 'Camera',
          color: '#3B82F6'
        };
        break;
      case 'person':
        newElement = {
          type: 'person',
          x,
          y,
          width: 30,
          height: 30,
          rotation: 0,
          label: 'Person',
          color: '#EF4444'
        };
        break;
      case 'wall':
        newElement = {
          type: 'wall',
          x,
          y,
          width: 100,
          height: 5,
          rotation: 0,
          label: 'Wall',
          color: '#6B7280'
        };
        break;
      case 'furniture-rect':
        newElement = {
          type: 'furniture',
          x,
          y,
          width: 60,
          height: 40,
          rotation: 0,
          label: 'Furniture',
          color: '#8B5CF6'
        };
        break;
      case 'furniture-circle':
        newElement = {
          type: 'furniture',
          x,
          y,
          width: 50,
          height: 50,
          rotation: 0,
          label: 'Table',
          color: '#10B981'
        };
        break;
      default:
        return;
    }

    onAddElement(newElement);
  }, [selectedTool, onAddElement]);

  const handleElementMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    const element = scene?.elements.find(el => el.id === elementId);
    if (!element) return;

    setDraggedElement(elementId);
    setDragOffset({
      x: e.clientX - element.x,
      y: e.clientY - element.y
    });
    onSelectElement(elementId);
  }, [scene, onSelectElement]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedElement) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    onUpdateElement(draggedElement, { x: newX, y: newY });
  }, [draggedElement, dragOffset, onUpdateElement]);

  const handleMouseUp = useCallback(() => {
    setDraggedElement(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={canvasRef}
      className="w-full h-full bg-white relative cursor-crosshair overflow-hidden"
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, #000 1px, transparent 1px),
            linear-gradient(to bottom, #000 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Elements */}
      {scene?.elements.map((element) => (
        <CameraPlotElement
          key={element.id}
          element={element}
          isSelected={selectedElements.includes(element.id)}
          onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          onUpdate={(updates) => onUpdateElement(element.id, updates)}
          onDelete={() => onDeleteElement(element.id)}
        />
      ))}

      {/* Instructions */}
      {(!scene || scene.elements.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium mb-2">Camera Plot Canvas</p>
            <p className="text-sm">Select a tool from the sidebar and click to add elements</p>
          </div>
        </div>
      )}
    </div>
  );
});

CameraPlotCanvas.displayName = 'CameraPlotCanvas';

export default CameraPlotCanvas;
