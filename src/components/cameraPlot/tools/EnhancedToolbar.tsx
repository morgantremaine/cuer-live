import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MousePointer2, 
  Camera, 
  User, 
  Square, 
  Circle,
  Minus,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Trash2,
  Move,
  Home,
  DoorOpen,
  RectangleHorizontal
} from 'lucide-react';
import FurnitureLibrary, { FurnitureItem } from '../furniture/FurnitureLibrary';
import ColorPicker from './ColorPicker';

interface EnhancedToolbarProps {
  selectedTool: string;
  selectedElements: string[];
  onToolSelect: (tool: string) => void;
  onFurnitureSelect: (furniture: FurnitureItem) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onColorChange: (color: string) => void;
  selectedColor: string;
  onCopy: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const EnhancedToolbar: React.FC<EnhancedToolbarProps> = ({
  selectedTool,
  selectedElements,
  onToolSelect,
  onFurnitureSelect,
  showGrid,
  onToggleGrid,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onColorChange,
  selectedColor,
  onCopy,
  onDelete,
  onDuplicate
}) => {
  const [activeSection, setActiveSection] = useState<'basic' | 'furniture' | 'walls'>('basic');

  const basicTools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'camera', icon: Camera, label: 'Camera' },
    { id: 'person', icon: User, label: 'Person' },
    { id: 'furniture-rect', icon: Square, label: 'Rectangle' },
    { id: 'furniture-circle', icon: Circle, label: 'Circle' }
  ];

  const wallTools = [
    { id: 'wall', icon: Minus, label: 'Wall' },
    { id: 'door', icon: DoorOpen, label: 'Door' },
    { id: 'window', icon: RectangleHorizontal, label: 'Window' }
  ];

  const hasSelectedElements = selectedElements.length > 0;

  const handleFurnitureSelect = (furniture: FurnitureItem) => {
    onFurnitureSelect(furniture);
    onToolSelect(furniture.id);
  };

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col h-full">
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-6">
          {/* Section Navigation */}
          <div className="flex gap-1">
            <Button
              variant={activeSection === 'basic' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('basic')}
              className={`flex-1 text-xs ${
                activeSection === 'basic' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600'
              }`}
            >
              Basic
            </Button>
            <Button
              variant={activeSection === 'furniture' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('furniture')}
              className={`flex-1 text-xs ${
                activeSection === 'furniture' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600'
              }`}
            >
              Furniture
            </Button>
            <Button
              variant={activeSection === 'walls' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('walls')}
              className={`flex-1 text-xs ${
                activeSection === 'walls' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600'
              }`}
            >
              Walls
            </Button>
          </div>

          {/* Basic Tools */}
          {activeSection === 'basic' && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Basic Tools</h3>
              <div className="grid grid-cols-2 gap-2">
                {basicTools.map((tool) => (
                  <Button
                    key={tool.id}
                    variant={selectedTool === tool.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onToolSelect(tool.id)}
                    className={`flex items-center gap-2 ${
                      selectedTool === tool.id 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600'
                    }`}
                  >
                    <tool.icon className="h-4 w-4" />
                    <span className="text-xs">{tool.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Furniture Library */}
          {activeSection === 'furniture' && (
            <FurnitureLibrary
              onSelectFurniture={handleFurnitureSelect}
              selectedTool={selectedTool}
            />
          )}

          {/* Wall Tools */}
          {activeSection === 'walls' && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Wall Tools</h3>
              <div className="grid grid-cols-1 gap-2">
                {wallTools.map((tool) => (
                  <Button
                    key={tool.id}
                    variant={selectedTool === tool.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onToolSelect(tool.id)}
                    className={`flex items-center gap-2 ${
                      selectedTool === tool.id 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600'
                    }`}
                  >
                    <tool.icon className="h-4 w-4" />
                    <span className="text-xs">{tool.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator className="bg-gray-600" />

          {/* Color Picker */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Color</h3>
            <ColorPicker
              color={selectedColor}
              onChange={onColorChange}
              disabled={!hasSelectedElements && selectedTool === 'select'}
            />
          </div>

          {/* Selection Actions */}
          {hasSelectedElements && (
            <>
              <Separator className="bg-gray-600" />
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  Selection ({selectedElements.length} items)
                </h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCopy}
                    className="w-full flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="text-xs">Copy</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDuplicate}
                    className="w-full flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="text-xs">Duplicate</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDelete}
                    className="w-full flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white border-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-xs">Delete</span>
                  </Button>
                </div>
              </div>
            </>
          )}

          <Separator className="bg-gray-600" />

          {/* View Controls */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">View</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleGrid}
                className={`w-full flex items-center gap-2 ${
                  showGrid 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
                <span className="text-xs">Grid</span>
              </Button>
              
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onZoomIn}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onZoomOut}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResetZoom}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-xs text-gray-400 text-center">
                Zoom: {Math.round(zoom * 100)}%
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default EnhancedToolbar;