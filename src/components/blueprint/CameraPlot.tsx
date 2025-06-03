
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit, Plus } from 'lucide-react';
import { useCameraPlot } from '@/hooks/useCameraPlot';

interface CameraPlotProps {
  rundownId: string;
  rundownTitle: string;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragEnterContainer?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: () => void;
}

const CameraPlot = ({ 
  rundownId, 
  rundownTitle, 
  isDragging, 
  onDragStart, 
  onDragEnterContainer, 
  onDragEnd 
}: CameraPlotProps) => {
  const { plots, createNewPlot, openPlotEditor } = useCameraPlot(rundownId, rundownTitle);

  console.log('CameraPlot component rendering with plots:', plots);

  const handleOpenEditor = () => {
    if (plots.length === 0) {
      // Create first plot if none exist
      createNewPlot('Scene 1');
    }
    openPlotEditor();
  };

  const renderMiniPreview = (plot: any) => {
    if (!plot.elements || plot.elements.length === 0) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
          Empty Scene
        </div>
      );
    }

    return (
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100">
        {plot.elements.map((element: any, index: number) => {
          // Scale down coordinates for mini preview
          const x = (element.x / 2000) * 200;
          const y = (element.y / 2000) * 100;
          const width = Math.max(2, (element.width / 2000) * 200);
          const height = Math.max(2, (element.height / 2000) * 100);

          if (element.type === 'camera') {
            return (
              <circle
                key={index}
                cx={x + width/2}
                cy={y + height/2}
                r={Math.max(2, width/2)}
                fill="#3b82f6"
                stroke="#1d4ed8"
                strokeWidth="0.5"
              />
            );
          } else if (element.type === 'wall') {
            return (
              <rect
                key={index}
                x={x}
                y={y}
                width={width}
                height={height}
                fill="#6b7280"
                transform={`rotate(${element.rotation || 0} ${x + width/2} ${y + height/2})`}
              />
            );
          } else if (element.type === 'person') {
            return (
              <circle
                key={index}
                cx={x + width/2}
                cy={y + height/2}
                r={Math.max(1.5, width/2)}
                fill="#10b981"
                stroke="#059669"
                strokeWidth="0.5"
              />
            );
          } else if (element.type === 'furniture') {
            return (
              <rect
                key={index}
                x={x}
                y={y}
                width={width}
                height={height}
                fill="#f59e0b"
                stroke="#d97706"
                strokeWidth="0.5"
                rx="1"
              />
            );
          }
          return null;
        })}
      </svg>
    );
  };

  return (
    <Card 
      className={`w-full mt-8 bg-gray-800 border-gray-700 ${isDragging ? 'opacity-50' : ''}`}
      draggable
      onDragStart={(e) => onDragStart?.(e, 'camera-plot')}
      onDragEnter={(e) => onDragEnterContainer?.(e, -1)}
      onDragEnd={onDragEnd}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
            <CardTitle className="text-xl text-white">Camera Plot</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleOpenEditor}
              size="sm"
              className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Plot
            </Button>
            <Button
              onClick={() => createNewPlot(`Scene ${plots.length + 1}`)}
              size="sm"
              variant="outline"
              className="text-white border-gray-600 hover:bg-gray-700 bg-transparent"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Scene
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {plots.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No camera plots created yet.</p>
            <p className="text-sm mt-2">Click "Edit Plot" to start creating your camera diagram.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plots.map((plot) => (
              <div
                key={plot.id}
                className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors cursor-pointer"
                onClick={handleOpenEditor}
              >
                <h4 className="text-white font-medium mb-2">{plot.name}</h4>
                <div className="bg-white rounded h-32 relative overflow-hidden">
                  {renderMiniPreview(plot)}
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {plot.elements?.length || 0} elements
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CameraPlot;
