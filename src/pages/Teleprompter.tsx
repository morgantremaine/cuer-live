import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { RundownItem } from '@/types/rundown';
import { useTeleprompterControls } from '@/hooks/useTeleprompterControls';
import { useTeleprompterScroll } from '@/hooks/useTeleprompterScroll';
import TeleprompterControls from '@/components/teleprompter/TeleprompterControls';
import TeleprompterContent from '@/components/teleprompter/TeleprompterContent';

const Teleprompter = () => {
  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();
  const [rundownData, setRundownData] = useState<{
    title: string;
    items: RundownItem[];
  } | null>(null);

  const {
    fontSize,
    isScrolling,
    scrollSpeed,
    isFullscreen,
    isUppercase,
    containerRef,
    toggleScrolling,
    resetScroll,
    adjustFontSize,
    adjustScrollSpeed,
    toggleFullscreen,
    toggleUppercase
  } = useTeleprompterControls();

  // Use the scroll hook
  useTeleprompterScroll(isScrolling, scrollSpeed, containerRef);

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
        <TeleprompterControls
          isScrolling={isScrolling}
          fontSize={fontSize}
          scrollSpeed={scrollSpeed}
          isUppercase={isUppercase}
          onToggleScrolling={toggleScrolling}
          onResetScroll={resetScroll}
          onToggleFullscreen={toggleFullscreen}
          onToggleUppercase={toggleUppercase}
          onAdjustFontSize={adjustFontSize}
          onAdjustScrollSpeed={adjustScrollSpeed}
        />
      )}

      {/* Content */}
      <TeleprompterContent
        containerRef={containerRef}
        isFullscreen={isFullscreen}
        itemsWithScript={itemsWithScript}
        fontSize={fontSize}
        isUppercase={isUppercase}
        getRowNumber={getRowNumber}
      />
    </div>
  );
};

export default Teleprompter;
