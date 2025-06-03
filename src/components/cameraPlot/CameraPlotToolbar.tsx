
import React from 'react';
import { Button } from '@/components/ui/button';
import { Move, Square, Circle, StopCircle, Grid3X3 } from 'lucide-react';

interface CameraPlotToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  isDrawingWall?: boolean;
  onStopDrawingWalls?: () => void;
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
  const CameraIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="16" height="10" stroke="currentColor" strokeWidth="2" fill="none" rx="1"/>
      <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="12" y1="13" x2="12" y2="6" stroke="currentColor" strokeWidth="2"/>
      <polygon points="12,6 10,8 14,8" fill="currentColor"/>
    </svg>
  );

  const PersonIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="12" y1="8" x2="12" y2="2" stroke="currentColor" strokeWidth="2"/>
      <polygon points="12,2 10,4 14,4" fill="currentColor"/>
    </svg>
  );

  const WallIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="10" width="18" height="4" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
    </svg>
  );

  const tools = [
    { id: 'select', icon: Move, label: 'Select' },
    { id: 'camera', icon: CameraIcon, label: 'Camera' },
    { id: 'person', icon: PersonIcon, label: 'Person' },
    { id: 'wall', icon: WallIcon, label: 'Wall' },
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
            Finish Wall
          </Button>
          <p className="text-xs text-gray-400 mt-2">
            Click to add points, double-click to finish the wall outline.
          </p>
        </div>
      )}
    </div>
  );
};

export default CameraPlotToolbar;
