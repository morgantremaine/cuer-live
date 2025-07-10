import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  MousePointer2, 
  Camera, 
  User, 
  Square, 
  Circle,
  Minus
} from 'lucide-react';

interface CameraPlotToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
}

const CameraPlotToolbar = ({
  selectedTool,
  onToolSelect
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
    </div>
  );
};

export default CameraPlotToolbar;