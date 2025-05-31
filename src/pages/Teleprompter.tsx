
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Plus, Minus, Play, Pause, RotateCcw } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Controls */}
      <div className="fixed top-4 left-4 z-10 flex space-x-2 bg-black bg-opacity-75 p-2 rounded">
        <button
          onClick={toggleScrolling}
          className="flex items-center space-x-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm"
        >
          {isScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          <span>{isScrolling ? 'Pause' : 'Play'}</span>
        </button>
        
        <button
          onClick={resetScroll}
          className="flex items-center space-x-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset</span>
        </button>
      </div>

      {/* Font Size Controls */}
      <div className="fixed top-4 right-4 z-10 flex items-center space-x-2 bg-black bg-opacity-75 p-2 rounded">
        <span className="text-sm">Font:</span>
        <button
          onClick={() => adjustFontSize(-2)}
          className="p-1 bg-gray-800 hover:bg-gray-700 rounded"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-sm w-8 text-center">{fontSize}</span>
        <button
          onClick={() => adjustFontSize(2)}
          className="p-1 bg-gray-800 hover:bg-gray-700 rounded"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Speed Controls */}
      <div className="fixed bottom-4 right-4 z-10 flex items-center space-x-2 bg-black bg-opacity-75 p-2 rounded">
        <span className="text-sm">Speed:</span>
        <button
          onClick={() => adjustScrollSpeed(-0.5)}
          className="p-1 bg-gray-800 hover:bg-gray-700 rounded"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-sm w-8 text-center">{scrollSpeed}x</span>
        <button
          onClick={() => adjustScrollSpeed(0.5)}
          className="p-1 bg-gray-800 hover:bg-gray-700 rounded"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        className="h-screen overflow-y-auto scrollbar-hide"
        style={{ paddingTop: '20vh', paddingBottom: '80vh' }}
      >
        <div className="max-w-4xl mx-auto px-8">
          {rundownData.items.map((item, index) => {
            if (isHeaderItem(item)) {
              return (
                <div key={item.id} className="mb-12">
                  <h2 
                    className="font-bold text-center mb-8"
                    style={{ fontSize: `${fontSize + 8}px` }}
                  >
                    [{getRowNumber(index)} {item.name?.toUpperCase() || 'HEADER'}]
                  </h2>
                </div>
              );
            }

            return (
              <div key={item.id} className="mb-16">
                {/* Segment Title */}
                <div 
                  className="text-center mb-6"
                  style={{ fontSize: `${fontSize + 4}px` }}
                >
                  [{getRowNumber(index)} {item.name?.toUpperCase() || 'SEGMENT'}]
                </div>

                {/* Talent */}
                {item.talent && (
                  <div 
                    className="text-center mb-8 bg-white text-black py-2 px-4 inline-block rounded mx-auto block"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {item.talent}
                  </div>
                )}

                {/* Script */}
                {item.script && (
                  <div 
                    className="leading-relaxed text-center whitespace-pre-wrap"
                    style={{ 
                      fontSize: `${fontSize}px`,
                      lineHeight: '1.6'
                    }}
                  >
                    {item.script}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Teleprompter;
