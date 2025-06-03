
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit } from 'lucide-react';
import { useCameraPlotScenes } from '@/hooks/cameraPlot/useCameraPlotScenes';
import { useNavigate } from 'react-router-dom';

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
  const { scenes, reloadPlots } = useCameraPlotScenes(rundownId, true);
  const navigate = useNavigate();

  useEffect(() => {
    handleReload();
  }, []);

  const handleReload = async () => {
    try {
      await reloadPlots();
    } catch (error) {
      console.error('Manual reload failed:', error);
    }
  };

  const handleOpenEditor = () => {
    navigate(`/camera-plot-editor/${rundownId}`);
  };

  const calculateBounds = (elements: any[]) => {
    if (!elements || elements.length === 0) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    elements.forEach((element: any) => {
      const elementMinX = element.x;
      const elementMinY = element.y;
      const elementMaxX = element.x + element.width;
      const elementMaxY = element.y + element.height;

      minX = Math.min(minX, elementMinX);
      minY = Math.min(minY, elementMinY);
      maxX = Math.max(maxX, elementMaxX);
      maxY = Math.max(maxY, elementMaxY);
    });

    // Add padding around the content
    const padding = 20;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding
    };
  };

  const renderMiniPreview = (plot: any) => {
    if (!plot.elements || plot.elements.length === 0) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs bg-gray-600">
          Empty Scene
        </div>
      );
    }

    const bounds = calculateBounds(plot.elements);
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    const viewBoxWidth = Math.max(contentWidth, 100);
    const viewBoxHeight = Math.max(contentHeight, 100);

    return (
      <div className="absolute inset-0 bg-gray-600">
        <svg 
          className="w-full h-full" 
          viewBox={`${bounds.minX} ${bounds.minY} ${viewBoxWidth} ${viewBoxHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {plot.elements.map((element: any, index: number) => {
            const x = element.x;
            const y = element.y;
            const width = element.width;
            const height = element.height;

            if (element.type === 'camera') {
              return (
                <g key={index}>
                  <path
                    d={`M${x + width * 0.3} ${y} h${width * 0.7} v${height} h-${width * 0.7} z M${x} ${y + height * 0.3} l${width * 0.3} ${height * 0.2} l-${width * 0.3} ${height * 0.2} z`}
                    fill="#3b82f6"
                    stroke="#1d4ed8"
                    strokeWidth="1"
                  />
                </g>
              );
            } else if (element.type === 'wall') {
              return (
                <rect
                  key={index}
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill="#374151"
                  transform={`rotate(${element.rotation || 0} ${x + width/2} ${y + height/2})`}
                />
              );
            } else if (element.type === 'person') {
              return (
                <circle
                  key={index}
                  cx={x + width/2}
                  cy={y + height/2}
                  r={Math.max(8, Math.min(width, height)/2)}
                  fill="#10b981"
                  stroke="#059669"
                  strokeWidth="1"
                />
              );
            } else if (element.type === 'furniture') {
              const isRound = element.label?.toLowerCase().includes('round') || element.label?.toLowerCase().includes('circle');
              
              if (isRound) {
                return (
                  <circle
                    key={index}
                    cx={x + width/2}
                    cy={y + height/2}
                    r={Math.min(width, height)/2}
                    fill="#f59e0b"
                    stroke="#d97706"
                    strokeWidth="1"
                  />
                );
              }
              
              return (
                <rect
                  key={index}
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill="#f59e0b"
                  stroke="#d97706"
                  strokeWidth="1"
                  rx="2"
                />
              );
            }
            return null;
          })}
        </svg>
      </div>
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
          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenEditor}
              size="sm"
              className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
            >
              <Edit className="h-4 w-4 mr-2" />
              Open Editor
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!scenes || scenes.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No camera plots created yet.</p>
            <p className="text-sm mt-2">Click "Open Editor" to start creating your camera diagram.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenes.map((plot) => (
              <div
                key={plot.id}
                className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors cursor-pointer"
                onClick={handleOpenEditor}
              >
                <h4 className="text-white font-medium mb-2">{plot.name}</h4>
                <div className="rounded h-32 relative overflow-hidden border border-gray-500">
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
