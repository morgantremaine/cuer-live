
import { CameraElement } from '@/hooks/useCameraPlot';

export const getNextCameraNumber = (elements: CameraElement[]) => {
  const cameraNumbers = elements
    .filter(el => el.type === 'camera')
    .map(el => el.cameraNumber || 0)
    .sort((a, b) => a - b);
  
  for (let i = 1; i <= cameraNumbers.length + 1; i++) {
    if (!cameraNumbers.includes(i)) {
      return i;
    }
  }
  return 1;
};
