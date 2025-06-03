
import React from 'react';
import { Button } from '@/components/ui/button';
import { Camera, User, Square, Circle, Move, Minus, StopCircle, Grid3X3 } from 'lucide-react';

interface CameraPlotToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  isDrawingWall: boolean;
  onStopDrawingWalls: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
}

const CameraPlotToolbar = ({ 
  selectedTool, 
  onToolSelect, 
  isDrawingWall, 
  onStopDrawingWalls,
  showGrid,
  onToggleGrid 
}: CameraPlotToolbarProps) => {
  const tools = [
    { id: 'select', icon: Move, label: 'Select' },
    { id: 'camera', icon: Camera, label: 'Camera' },
    { id: 'person', icon: User, label: 'Person' },
    { id: 'wall', icon: Minus, label: 'Wall' },
    { id: 'furniture-rect', icon: Square, label: 'Table' },
    { id: 'furniture-circle', icon: Circle, label: 'Round Table' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Tools</h3>
      <div className="grid grid-cols-2 gap-2">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={selectedTool === tool.id ? 'default' : 'outline'}
            size="sm"
            className={`flex flex-col items-center gap-1 h-auto py-3 ${
              selectedTool === tool.id 
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
                : 'text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white bg-transparent'
            }`}
            onClick={() => onToolSelect(tool.id)}
          >
            <tool.icon className="h-4 w-4" />
            <span className="text-xs">{tool.label}</span>
          </Button>
        ))}
      </div>
      
      <div className="border-t border-gray-600 pt-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Options</h3>
        <Button
          onClick={onToggleGrid}
          size="sm"
          variant="outline"
          className={`w-full mb-2 ${
            showGrid 
              ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
              : 'text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white bg-transparent'
          }`}
        >
          <Grid3X3 className="h-4 w-4 mr-2" />
          Grid: {showGrid ? 'ON' : 'OFF'}
        </Button>
      </div>
      
      {isDrawingWall && (
        <div className="border-t border-gray-600 pt-4">
          <Button
            onClick={onStopDrawingWalls}
            size="sm"
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <StopCircle className="h-4 w-4 mr-2" />
            Finish Drawing
          </Button>
          <p className="text-xs text-gray-400 mt-2">
            Click to place wall endpoints. Click "Finish Drawing" when done.
          </p>
        </div>
      )}
    </div>
  );
};

export default CameraPlotToolbar;
