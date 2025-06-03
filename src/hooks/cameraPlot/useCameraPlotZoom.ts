
import { useState, useCallback } from 'react';

export const useCameraPlotZoom = () => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.5, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.5, 0.25));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const updatePan = useCallback((deltaX: number, deltaY: number) => {
    setPan(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
  }, []);

  return {
    zoom,
    pan,
    zoomIn,
    zoomOut,
    resetZoom,
    updatePan
  };
};
