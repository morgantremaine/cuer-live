
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit } from 'lucide-react';
import { useUnifiedCameraPlot } from '@/hooks/blueprint/useUnifiedCameraPlot';
import { useNavigate } from 'react-router-dom';
import CameraPlotSceneGrid from './cameraPlot/CameraPlotSceneGrid';

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
  const { scenes, reloadPlots, isLoading } = useUnifiedCameraPlot();
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
    navigate(`/rundown/${rundownId}/camera-plot-editor`);
  };

  if (isLoading) {
    return (
      <Card className="w-full mt-8 bg-gray-800 border-gray-700">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

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
        <CameraPlotSceneGrid scenes={scenes} onOpenEditor={handleOpenEditor} />
      </CardContent>
    </Card>
  );
};

export default CameraPlot;
