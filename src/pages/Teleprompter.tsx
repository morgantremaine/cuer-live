
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';
import { useTeleprompterControls } from '@/hooks/useTeleprompterControls';
import { useTeleprompterScroll } from '@/hooks/useTeleprompterScroll';
import TeleprompterControls from '@/components/teleprompter/TeleprompterControls';
import TeleprompterContent from '@/components/teleprompter/TeleprompterContent';
import { useAuth } from '@/hooks/useAuth';

const Teleprompter = () => {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const rundownId = params.id;
  
  const [rundownData, setRundownData] = useState<{
    title: string;
    items: RundownItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    toggleUppercase,
    getCurrentSpeed,
    isReverse
  } = useTeleprompterControls();

  // Use the scroll hook with reverse support
  useTeleprompterScroll(isScrolling, scrollSpeed, containerRef, isReverse());

  // Load rundown data with authentication
  const loadRundownData = async () => {
    if (!rundownId || !user) {
      setLoading(false);
      setError('Authentication required or no rundown ID provided');
      return;
    }

    setError(null);

    try {
      // Access rundown with authentication
      const { data, error: queryError } = await supabase
        .from('rundowns')
        .select('id, title, items, columns, created_at, updated_at')
        .eq('id', rundownId)
        .single();

      if (queryError) {
        console.error('Database error:', queryError);
        setError(`Unable to load rundown: ${queryError.message}`);
        setRundownData(null);
      } else if (data) {
        setRundownData({
          title: data.title || 'Untitled Rundown',
          items: data.items || []
        });
        setError(null);
      } else {
        setError('Rundown not found');
        setRundownData(null);
      }
    } catch (error) {
      console.error('Network error fetching rundown:', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setRundownData(null);
    }

    setLoading(false);
  };

  // Update script content and sync back to main rundown
  const updateScriptContent = async (itemId: string, newScript: string) => {
    if (!rundownData || !user) return;

    try {
      // Update the local state immediately
      const updatedItems = rundownData.items.map(item =>
        item.id === itemId ? { ...item, script: newScript } : item
      );
      
      setRundownData({
        ...rundownData,
        items: updatedItems
      });

      // Update the database
      const { error } = await supabase
        .from('rundowns')
        .update({ 
          items: updatedItems,
          updated_at: new Date().toISOString()
        })
        .eq('id', rundownId);

      if (error) {
        console.error('Error updating script:', error);
        // Revert local state on error
        setRundownData(rundownData);
      }
    } catch (error) {
      console.error('Error updating script:', error);
    }
  };

  // Initial load
  useEffect(() => {
    loadRundownData();
  }, [rundownId, user]);

  // Set up polling for updates (check every 5 seconds)
  useEffect(() => {
    if (!rundownId || loading || !user) return;
    
    const pollInterval = setInterval(() => {
      loadRundownData();
    }, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [rundownId, loading, user]);

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

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-2">Error loading teleprompter</div>
          <div className="text-gray-400 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!rundownData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-2">Rundown not found</div>
          <div className="text-gray-400 text-sm">
            The rundown may not exist or you may not have access to it.
          </div>
        </div>
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
          scrollSpeed={getCurrentSpeed()}
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
        onUpdateScript={updateScriptContent}
        canEdit={!isFullscreen}
      />

      {/* Keyboard Instructions - Only show when not fullscreen */}
      {!isFullscreen && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
          <div>Arrow Keys: Adjust Speed | Space: Play/Pause | Esc: Exit Fullscreen</div>
          <div>Click on script text to edit (editing pauses scrolling)</div>
        </div>
      )}
    </div>
  );
};

export default Teleprompter;
