
import React from 'react';
import { Plus, Minus, Play, Pause, RotateCcw, Maximize, Type, Printer, List, Bold } from 'lucide-react';

interface TeleprompterControlsProps {
  isScrolling: boolean;
  fontSize: number;
  scrollSpeed: number; // This now represents the actual speed (can be negative)
  isUppercase: boolean;
  isBold: boolean;
  showAllSegments: boolean;
  onToggleScrolling: () => void;
  onResetScroll: () => void;
  onToggleFullscreen: () => void;
  onToggleUppercase: () => void;
  onToggleBold: () => void;
  onToggleShowAllSegments: () => void;
  onAdjustFontSize: (delta: number) => void;
  onAdjustScrollSpeed: (delta: number) => void;
  onPrint?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

const TeleprompterControls = ({
  isScrolling,
  fontSize,
  scrollSpeed,
  isUppercase,
  isBold,
  showAllSegments,
  onToggleScrolling,
  onResetScroll,
  onToggleFullscreen,
  onToggleUppercase,
  onToggleBold,
  onToggleShowAllSegments,
  onAdjustFontSize,
  onAdjustScrollSpeed,
  onPrint,
  isSidebarCollapsed,
  onToggleSidebar
}: TeleprompterControlsProps) => {
  const formatSpeed = (speed: number) => {
    if (speed === 0) return '0x';
    return `${speed > 0 ? '' : ''}${speed}x`;
  };

  const getPlayButtonText = () => {
    if (scrollSpeed === 0) return 'Play';
    return isScrolling ? 'Pause' : 'Resume';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-10 bg-background border-b border-border p-4">
      <div className="flex justify-between items-center">
        {/* Left controls */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleScrolling}
            className="flex items-center space-x-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded text-sm w-28"
          >
            {isScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{getPlayButtonText()}</span>
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

          <button
            onClick={onToggleUppercase}
            className={`flex items-center space-x-2 px-4 py-2 rounded text-sm ${
              isUppercase ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <Type className="h-4 w-4" />
            <span>UPPERCASE</span>
          </button>

          <button
            onClick={onToggleBold}
            className={`flex items-center space-x-2 px-4 py-2 rounded text-sm ${
              isBold ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <Bold className="h-4 w-4" />
            <span>BOLD</span>
          </button>

          <button
            onClick={onToggleShowAllSegments}
            className={`flex items-center space-x-2 px-4 py-2 rounded text-sm ${
              showAllSegments ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <List className="h-4 w-4" />
            <span>{showAllSegments ? 'All Segments' : 'With Script'}</span>
          </button>

          {onPrint && (
            <button
              onClick={onPrint}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
          )}
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
            <span className={`text-sm w-12 text-center ${scrollSpeed < 0 ? 'text-orange-400' : scrollSpeed === 0 ? 'text-gray-400' : 'text-white'}`}>
              {formatSpeed(scrollSpeed)}
            </span>
            <button
              onClick={() => onAdjustScrollSpeed(0.5)}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right side - Current Status */}
        <div className="w-32 text-right text-sm">
          <div className={`font-semibold ${
            scrollSpeed < 0 ? 'text-orange-400' : 
            scrollSpeed === 0 ? 'text-gray-400' : 
            'text-green-400'
          }`}>
            {scrollSpeed < 0 ? 'REVERSE' : scrollSpeed === 0 ? 'STOPPED' : 'FORWARD'}
          </div>
          <div className="text-xs text-gray-400">
            {isScrolling ? 'Playing' : 'Paused'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeleprompterControls;
