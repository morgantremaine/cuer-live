
import { CameraElement, CameraPlotScene } from '@/hooks/useCameraPlot';
import { WallSegment } from './useWallDrawingState';

export const useWallElementCreation = (
  activeScene: CameraPlotScene | undefined,
  updatePlot: (plotId: string, updatedPlot: Partial<CameraPlotScene>) => void
) => {
  const createWallElements = (segments: WallSegment[]) => {
    if (!activeScene) {
      return;
    }

    const newWallElements: CameraElement[] = segments.map(segment => {
      const distance = Math.sqrt(
        Math.pow(segment.end.x - segment.start.x, 2) + 
        Math.pow(segment.end.y - segment.start.y, 2)
      );
      
      const angle = Math.atan2(
        segment.end.y - segment.start.y, 
        segment.end.x - segment.start.x
      ) * (180 / Math.PI);
      
      // Calculate the center point of the line segment
      const centerX = (segment.start.x + segment.end.x) / 2;
      const centerY = (segment.start.y + segment.end.y) / 2;
      
      // Create wall centered on the line segment
      const wallElement: CameraElement = {
        id: segment.id,
        type: 'wall',
        x: centerX - distance / 2, // Position so the wall rectangle centers on the line
        y: centerY - 2, // Center the wall height around the line
        width: distance,
        height: 4,
        rotation: angle,
        scale: 1,
        label: '',
        labelOffsetX: 0,
        labelOffsetY: -20
      };
      
      
      return wallElement;
    });

    // Add all wall elements to the scene
    const updatedElements = [...activeScene.elements, ...newWallElements];
    
    updatePlot(activeScene.id, { elements: updatedElements });
  };

  return {
    createWallElements
  };
};
