
import React from 'react';
import { CameraPlotScene } from '@/hooks/cameraPlot/core/useCameraPlotData';
import CameraPlotMiniPreview from './CameraPlotMiniPreview';

interface CameraPlotSceneGridProps {
  scenes: CameraPlotScene[];
  onOpenEditor: () => void;
}

const CameraPlotSceneGrid = ({ scenes, onOpenEditor }: CameraPlotSceneGridProps) => {
  if (!scenes || scenes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No camera plots created yet.</p>
        <p className="text-sm mt-2">Click "Open Editor" to start creating your camera diagram.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {scenes.map((plot) => (
        <div
          key={plot.id}
          className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors cursor-pointer"
          onClick={onOpenEditor}
        >
          <h4 className="text-white font-medium mb-2">{plot.name}</h4>
          <div className="rounded h-32 relative overflow-hidden border border-gray-500">
            <CameraPlotMiniPreview plot={plot} />
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {plot.elements?.length || 0} elements
          </div>
        </div>
      ))}
    </div>
  );
};

export default CameraPlotSceneGrid;
