
import React from 'react';
import { Button } from '@/components/ui/button';
import { Camera, User, Square, Circle, Move, Minus, StopCircle } from 'lucide-react';

interface CameraPlotToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  isDrawingWall: boolean;
  onStopDrawingWalls: () => void;
}

const CameraPlotToolbar = ({ selectedTool, onToolSelect, isDrawingWall, onStopDrawingWalls }: CameraPlotToolbarProps) => {
  const tools = [
    { id: 'select', icon: Move, label: 'Select' },
    { id: 'camera', icon: Camera, label: 'Camera' },
    { id: 'person', icon: User, label: 'Person' },
    { id: 'wall', icon: Minus, label: 'Wall' },
    { id: 'furniture-rect', icon: Square, label: 'Rectangle' },
    { id: 'furniture-circle', icon: Circle, label: 'Circle' },
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
                : 'text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => onToolSelect(tool.id)}
          >
            <tool.icon className="h-4 w-4" />
            <span className="text-xs">{tool.label}</span>
          </Button>
        ))}
      </div>
      
      {isDrawingWall && (
        <div className="mt-4">
          <Button
            onClick={onStopDrawingWalls}
            size="sm"
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <StopCircle className="h-4 w-4 mr-2" />
            Done Drawing Walls
          </Button>
        </div>
      )}
    </div>
  );
};

export default CameraPlotToolbar;
