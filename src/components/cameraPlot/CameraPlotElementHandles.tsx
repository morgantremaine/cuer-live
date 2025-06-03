
import React from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface CameraPlotElementHandlesProps {
  element: CameraElement;
  isSelected: boolean;
  onRotationStart?: (e: React.MouseEvent) => void;
  isRotating?: boolean;
}

const CameraPlotElementHandles = ({ 
  element, 
  isSelected, 
  onRotationStart,
  isRotating 
}: CameraPlotElementHandlesProps) => {
  // Remove all visual handles and selection indicators
  // Return null to render nothing
  return null;
};

export default CameraPlotElementHandles;
