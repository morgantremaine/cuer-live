
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Plus, Minus, Play, Pause, RotateCcw, Maximize } from 'lucide-react';

const Teleprompter = () => {
  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();
  const [rundownData, setRundownData] = useState<{
    title: string;
    items: RundownItem[];
  } | null>(null);
  const [fontSize, setFontSize] = useState(24);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load rundown data
  useEffect(() => {
    if (loading || !rundownId) return;

    const rundown = savedRundowns.find(r => r.id === rundownId);
    if (rundown) {
      setRundownData({
        title: rundown.title,
        items: rundown.items || []
      });
    }
  }, [rundownId, savedRundowns, loading]);

  // Handle smooth scrolling
  useEffect(() => {
    if (isScrolling && containerRef.current) {
      scrollIntervalRef.current = setInterval(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop += scrollSpeed;
        }
      }, 16); // ~60fps
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [isScrolling, scrollSpeed]);

  // Handle fullscreen and escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const getRowNumber = (index: number) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let letterIndex = 0;
    let numberIndex = 0;
    
    for (let i = 0; i <= index; i++) {
      if (rundownData?.items[i]?.type === 'header') {
        letterIndex++;
        numberIndex = 0;
      } else {
        numberIndex++;
      }
    }
    
    const currentItem = rundownData?.items[index];
    if (currentItem?.type === 'header') {
      return letters[letterIndex - 1] || 'A';
    } else {
      const letter = letters[letterIndex - 1] || 'A';
      return `${letter}${numberIndex}`;
    }
  };

  const toggleScrolling = () => {
    setIsScrolling(!isScrolling);
  };

  const resetScroll = () => {
    setIsScrolling(false);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  };

  const adjustFontSize = (delta: number) => {
    setFontSize(prev => Math.max(12, Math.min(72, prev + delta)));
  };

  const adjustScrollSpeed = (delta: number) => {
    setScrollSpeed(prev => Math.max(0.5, Math.min(5, prev + delta)));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading teleprompter...</div>
      </div>
    );
  }

  if (!rundownData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Rundown not found</div>
      </div>
    );
  }

  // Filter items to only show those with script content
  const itemsWithScript = rundownData.items.map((item, originalIndex) => ({
    ...item,
    originalIndex
  })).filter(item => item.script && item.script.trim() !== '');

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Top Menu Controls - Hidden in fullscreen */}
      {!isFullscreen && (
        <div className="fixed top-0 left-0 right-0 z-10 bg-black bg-opacity-90 border-b border-gray-700 p-4">
          <div className="flex justify-between items-center">
            {/* Left controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleScrolling}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm"
              >
                {isScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{isScrolling ? 'Pause' : 'Play'}</span>
              </button>
              
              <button
                onClick={resetScroll}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </button>

              <button
                onClick={toggleFullscreen}
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
                  onClick={() => adjustFontSize(-2)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm w-8 text-center">{fontSize}</span>
                <button
                  onClick={() => adjustFontSize(2)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Speed Controls */}
              <div className="flex items-center space-x-2">
                <span className="text-sm">Speed:</span>
                <button
                  onClick={() => adjustScrollSpeed(-0.5)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm w-8 text-center">{scrollSpeed}x</span>
                <button
                  onClick={() => adjustScrollSpeed(0.5)}
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
      )}

      {/* Content */}
      <div
        ref={containerRef}
        className="h-screen overflow-y-auto scrollbar-hide"
        style={{ 
          paddingTop: isFullscreen ? '20vh' : '120px', 
          paddingBottom: '80vh' 
        }}
      >
        <div className="w-full px-8">
          {itemsWithScript.map((item, index) => {
            if (isHeaderItem(item)) {
              return (
                <div key={item.id} className="mb-12">
                  <h2 
                    className="font-bold text-left mb-8"
                    style={{ fontSize: `${fontSize + 8}px` }}
                  >
                    [{getRowNumber(item.originalIndex)} {item.name?.toUpperCase() || 'HEADER'}]
                  </h2>
                </div>
              );
            }

            return (
              <div key={item.id} className="mb-16">
                {/* Segment Title */}
                <div 
                  className="text-left mb-6"
                  style={{ fontSize: `${fontSize + 4}px` }}
                >
                  [{getRowNumber(item.originalIndex)} {item.name?.toUpperCase() || 'UNTITLED'}]
                </div>

                {/* Talent */}
                {item.talent && (
                  <div 
                    className="text-left mb-8 bg-white text-black py-2 px-4 inline-block rounded"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {item.talent}
                  </div>
                )}

                {/* Script */}
                <div 
                  className="leading-relaxed text-left whitespace-pre-wrap"
                  style={{ 
                    fontSize: `${fontSize}px`,
                    lineHeight: '1.6'
                  }}
                >
                  {item.script}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fullscreen hint */}
      {isFullscreen && (
        <div className="fixed bottom-4 right-4 z-10 bg-black bg-opacity-75 px-3 py-2 rounded text-sm">
          Press ESC to exit fullscreen
        </div>
      )}
    </div>
  );
};

export default Teleprompter;
