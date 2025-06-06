import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';
import { useTeleprompterControls } from '@/hooks/useTeleprompterControls';
import { useTeleprompterScroll } from '@/hooks/useTeleprompterScroll';
import TeleprompterControls from '@/components/teleprompter/TeleprompterControls';
import TeleprompterContent from '@/components/teleprompter/TeleprompterContent';

const Teleprompter = () => {
  const params = useParams<{ id: string }>();
  // Filter out the literal ":id" string that sometimes comes from route patterns
  const rawId = params.id;
  const rundownId = rawId === ':id' ? undefined : rawId;
  
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

  // Load rundown data with public access (same as SharedRundown)
  const loadRundownData = async () => {
    if (!rundownId) {
      setLoading(false);
      setError('No rundown ID provided');
      return;
    }

    console.log('Loading teleprompter rundown with ID:', rundownId);
    setError(null);

    try {
      // Try to access rundown without RLS enforcement (public access)
      const { data, error: queryError } = await supabase
        .from('rundowns')
        .select('id, title, items, columns, created_at, updated_at')
        .eq('id', rundownId)
        .single();

      console.log('Supabase query result:', { data, error: queryError });

      if (queryError) {
        // Handle different types of errors
        if (queryError.code === 'PGRST116') {
          setError('Rundown not found - it may be private or the ID is incorrect');
        } else if (queryError.message.includes('RLS')) {
          setError('This rundown is private and cannot be shared publicly');
        } else {
          setError(`Database error: ${queryError.message} (Code: ${queryError.code})`);
        }
        setRundownData(null);
      } else if (data) {
        console.log('Successfully loaded teleprompter rundown data:', data);
        setRundownData({
          title: data.title || 'Untitled Rundown',
          items: data.items || []
        });
        setError(null);
      } else {
        console.log('No rundown found with ID:', rundownId);
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

  // Initial load
  useEffect(() => {
    loadRundownData();
  }, [rundownId]);

  // Set up polling for updates (check every 5 seconds, same as SharedRundown)
  useEffect(() => {
    if (!rundownId || loading) return;

    console.log('Setting up polling for teleprompter updates:', rundownId);
    
    const pollInterval = setInterval(() => {
      console.log('Polling for teleprompter updates...');
      loadRundownData();
    }, 5000); // Poll every 5 seconds

    return () => {
      console.log('Cleaning up polling interval');
      clearInterval(pollInterval);
    };
  }, [rundownId, loading]);

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
          <div className="text-gray-500 text-xs mt-4">
            This rundown may be private or the link may be incorrect.
          </div>
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
            This rundown may be private or the link may be incorrect.
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
      />

      {/* Keyboard Instructions - Only show when not fullscreen */}
      {!isFullscreen && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
          <div>Arrow Keys: Adjust Speed | Space: Play/Pause | Esc: Exit Fullscreen</div>
        </div>
      )}
    </div>
  );
};

export default Teleprompter;
