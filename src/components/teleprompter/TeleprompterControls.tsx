
import React from 'react';
import { Plus, Minus, Play, Pause, RotateCcw, Maximize } from 'lucide-react';

interface TeleprompterControlsProps {
  isScrolling: boolean;
  fontSize: number;
  scrollSpeed: number;
  onToggleScrolling: () => void;
  onResetScroll: () => void;
  onToggleFullscreen: () => void;
  onAdjustFontSize: (delta: number) => void;
  onAdjustScrollSpeed: (delta: number) => void;
}

const TeleprompterControls = ({
  isScrolling,
  fontSize,
  scrollSpeed,
  onToggleScrolling,
  onResetScroll,
  onToggleFullscreen,
  onAdjustFontSize,
  onAdjustScrollSpeed
}: TeleprompterControlsProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-10 bg-black bg-opacity-90 border-b border-gray-700 p-4">
      <div className="flex justify-between items-center">
        {/* Left controls */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleScrolling}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm"
          >
            {isScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isScrolling ? 'Pause' : 'Play'}</span>
          </button>
          
          <button
            onClick={onResetScroll}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>

          <button
            onClick={onToggleFullscreen}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm"
          >
            <Maximize className="h-4 w-4" />
            <span>Fullscreen</span>
          </button>
        </div>

        {/* Center controls */}
        <div className="flex items-center space-x-6">
          {/* Font Size Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm">Font:</span>
            <button
              onClick={() => onAdjustFontSize(-2)}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm w-8 text-center">{fontSize}</span>
            <button
              onClick={() => onAdjustFontSize(2)}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Speed Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm">Speed:</span>
            <button
              onClick={() => onAdjustScrollSpeed(-0.5)}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm w-8 text-center">{scrollSpeed}x</span>
            <button
              onClick={() => onAdjustScrollSpeed(0.5)}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right side - empty for balance */}
        <div className="w-32"></div>
      </div>
    </div>
  );
};

export default TeleprompterControls;
