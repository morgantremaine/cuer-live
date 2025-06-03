
import React from 'react';
import { Button } from '@/components/ui/button';
import { Move, Square, Circle, Grid3X3, Camera, User, ZoomIn, ZoomOut } from 'lucide-react';

interface CameraPlotToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

const CameraPlotToolbar = ({ 
  selectedTool, 
  onToolSelect, 
  showGrid,
  onToggleGrid,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom
}: CameraPlotToolbarProps) => {
  const WallIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="10" width="18" height="4" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
    </svg>
  );

  const tools = [
    { id: 'select', icon: Move, label: 'Select' },
    { id: 'camera', icon: Camera, label: 'Camera' },
    { id: 'person', icon: User, label: 'Person' },
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
        <h3 className="text-sm font-medium text-gray-300 mb-3">View</h3>
        
        <div className="space-y-2">
          <div className="flex gap-1">
            <Button
              onClick={onZoomIn}
              size="sm"
              variant="outline"
              className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white bg-transparent"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              onClick={onZoomOut}
              size="sm"
              variant="outline"
              className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white bg-transparent"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            onClick={onResetZoom}
            size="sm"
            variant="outline"
            className="w-full text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white bg-transparent"
          >
            Reset View ({Math.round(zoom * 100)}%)
          </Button>
          
          <Button
            onClick={onToggleGrid}
            size="sm"
            variant="outline"
            className={`w-full ${
              showGrid 
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
                : 'text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white bg-transparent'
            }`}
          >
            <Grid3X3 className="h-4 w-4 mr-2" />
            Grid: {showGrid ? 'ON' : 'OFF'}
          </Button>
        </div>
        
        {selectedTool === 'wall' && (
          <div className="mt-4">
            <p className="text-xs text-gray-400">
              Click to start drawing walls, double-click to finish.
            </p>
          </div>
        )}
        
        {selectedTool === 'select' && (
          <div className="mt-4">
            <p className="text-xs text-gray-400">
              Drag background to pan when zoomed in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraPlotToolbar;
