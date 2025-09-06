import React from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  isDefaultZoom: boolean;
  size?: 'sm' | 'default';
}

const ZoomControls = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canZoomIn,
  canZoomOut,
  isDefaultZoom,
  size = 'sm'
}: ZoomControlsProps) => {
  const formatZoomPercentage = (zoom: number) => {
    return `${Math.round(zoom * 100)}%`;
  };

  return (
    <div className="flex items-center space-x-1">
      <Separator orientation="vertical" className="h-6" />
      
      <Button
        variant="ghost"
        size={size}
        onClick={onZoomOut}
        disabled={!canZoomOut}
        className="h-8 w-8 p-0 disabled:opacity-30"
        title="Zoom Out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size={size}
        onClick={onResetZoom}
        disabled={isDefaultZoom}
        className="h-8 px-2 disabled:opacity-30 min-w-[60px]"
        title="Reset Zoom (100%)"
      >
        <span className="text-xs font-mono">
          {formatZoomPercentage(zoomLevel)}
        </span>
      </Button>
      
      <Button
        variant="ghost"
        size={size}
        onClick={onZoomIn}
        disabled={!canZoomIn}
        className="h-8 w-8 p-0 disabled:opacity-30"
        title="Zoom In"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ZoomControls;