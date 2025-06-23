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
    showAllSegments,
    containerRef,
    toggleScrolling,
    resetScroll,
    adjustFontSize,
    adjustScrollSpeed,
    toggleFullscreen,
    toggleUppercase,
    toggleShowAllSegments,
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

  // Updated helper function to check if item should be included in teleprompter
  const shouldIncludeInTeleprompter = (item: RundownItem) => {
    if (showAllSegments) {
      // Show all segments when toggle is on
      return true;
    } else {
      // Original logic - only show items with script content
      if (!item.script) return false;
      const trimmedScript = item.script.trim();
      if (trimmedScript === '') return false;
      // Include items with [null] marker (case-insensitive) or any other content
      return true;
    }
  };

  // Print function
  const handlePrint = () => {
    if (!rundownData) return;

    // Filter items using the same logic as display
    const itemsWithScript = rundownData.items.map((item, originalIndex) => ({
      ...item,
      originalIndex
    })).filter(shouldIncludeInTeleprompter);
    
    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Helper function to format text (with uppercase if needed)
    const formatText = (text: string) => {
      return isUppercase ? text.toUpperCase() : text;
    };

    // Helper function to process script text and remove bracket styling for print
    const processScriptForPrint = (text: string) => {
      // Handle [null] case (case-insensitive) - don't show any script content in print
      if (text.trim().toLowerCase() === '[null]') {
        return '';
      }
      // Remove bracket formatting for print - just keep the text inside brackets
      const cleanText = text.replace(/\[([^\[\]{}]+)(?:\{[^}]+\})?\]/g, '$1');
      return formatText(cleanText);
    };

    // Generate HTML for print
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${rundownData.title} - Teleprompter Script</title>
          <style>
            @media print {
              @page {
                margin: 0.75in;
                size: letter;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              color: black;
              background: white;
              line-height: 1.4;
              margin: 0;
              padding: 0;
              font-size: 14px;
            }
            .script-item {
              margin-bottom: 25px;
              page-break-inside: avoid;
              orphans: 2;
              widows: 2;
            }
            .script-title {
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 8px;
              padding: 4px 8px;
              background: #f0f0f0;
              border: 1px solid #ccc;
              display: inline-block;
              page-break-after: avoid;
            }
            .script-content {
              font-size: 14px;
              line-height: 1.5;
              white-space: pre-wrap;
              margin-left: 0;
            }
            .page-break {
              page-break-before: always;
            }
          </style>
        </head>
        <body>
          ${itemsWithScript.map((item, index) => {
            const rowNumber = getRowNumber(item.originalIndex);
            const isHeader = item.type === 'header';
            const title = isHeader 
              ? `${rowNumber} - ${formatText((item.segmentName || item.name)?.toUpperCase() || 'HEADER')}`
              : `${rowNumber} - ${formatText((item.segmentName || item.name)?.toUpperCase() || 'UNTITLED')}`;
            
            const scriptContent = processScriptForPrint(item.script || '');
            
            return `
              <div class="script-item ${index > 0 && index % 4 === 0 ? 'page-break' : ''}">
                <div class="script-title">${title}</div>
                ${scriptContent ? `<div class="script-content">${scriptContent}</div>` : ''}
              </div>
            `;
          }).join('')}
        </body>
      </html>
    `;

    // Write content and print
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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

  // Filter items using the updated helper function and add originalIndex
  const itemsWithScript = rundownData?.items.map((item, originalIndex) => ({
    ...item,
    originalIndex
  })).filter(shouldIncludeInTeleprompter) || [];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Top Menu Controls - Hidden in fullscreen */}
      {!isFullscreen && (
        <TeleprompterControls
          isScrolling={isScrolling}
          fontSize={fontSize}
          scrollSpeed={getCurrentSpeed()}
          isUppercase={isUppercase}
          showAllSegments={showAllSegments}
          onToggleScrolling={toggleScrolling}
          onResetScroll={resetScroll}
          onToggleFullscreen={toggleFullscreen}
          onToggleUppercase={toggleUppercase}
          onToggleShowAllSegments={toggleShowAllSegments}
          onAdjustFontSize={adjustFontSize}
          onAdjustScrollSpeed={adjustScrollSpeed}
          onPrint={handlePrint}
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
          <div>Enter Fullscreen for keyboard controls (Arrow Keys: Speed | Space: Play/Pause)</div>
          <div>Click on script text to edit</div>
        </div>
      )}
    </div>
  );
};

export default Teleprompter;
