
import { CameraElement, CameraPlotScene } from '@/hooks/useCameraPlot';
import { WallSegment } from './useWallDrawingState';

export const useWallElementCreation = (
  activeScene: CameraPlotScene | undefined,
  updatePlot: (plotId: string, updatedPlot: Partial<CameraPlotScene>) => void
) => {
  const createWallElements = (segments: WallSegment[]) => {
    if (!activeScene) {
      console.log('No active scene for wall creation');
      return;
    }

    console.log('Creating wall elements for segments:', segments);
    
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
      
      console.log('Created wall element:', {
        id: wallElement.id,
        start: segment.start,
        end: segment.end,
        center: { x: centerX, y: centerY },
        position: { x: wallElement.x, y: wallElement.y },
        width: wallElement.width,
        height: wallElement.height,
        angle: wallElement.rotation,
        distance
      });
      
      return wallElement;
    });

    // Add all wall elements to the scene
    const updatedElements = [...activeScene.elements, ...newWallElements];
    console.log('Updating scene with', newWallElements.length, 'new wall elements');
    
    updatePlot(activeScene.id, { elements: updatedElements });
  };

  return {
    createWallElements
  };
};
