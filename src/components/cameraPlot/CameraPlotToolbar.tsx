import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  MousePointer2, 
  Camera, 
  User, 
  Square, 
  Circle,
  Minus,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';

interface CameraPlotToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

const CameraPlotToolbar = ({
  selectedTool,
  onToolSelect,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom
}: CameraPlotToolbarProps) => {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'camera', icon: Camera, label: 'Camera' },
    { id: 'person', icon: User, label: 'Person' },
    { id: 'wall', icon: Minus, label: 'Wall' },
    { id: 'furniture-rect', icon: Square, label: 'Square' },
    { id: 'furniture-circle', icon: Circle, label: 'Circle' }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">Tools</h3>
        <div className="grid grid-cols-2 gap-2">
          {tools.map((tool) => (
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

      <Separator className="bg-gray-600" />

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">View</h3>
        <div className="space-y-2">
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
  );
};

export default CameraPlotToolbar;