import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';
import { useTeleprompterControls } from '@/hooks/useTeleprompterControls';
import { useTeleprompterScroll } from '@/hooks/useTeleprompterScroll';
import { useTeleprompterSave } from '@/hooks/useTeleprompterSave';
import TeleprompterControls from '@/components/teleprompter/TeleprompterControls';
import TeleprompterContent from '@/components/teleprompter/TeleprompterContent';
import TeleprompterSaveIndicator from '@/components/teleprompter/TeleprompterSaveIndicator';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
  const [isPollingPaused, setIsPollingPaused] = useState(false);

  const {
    fontSize,
    isScrolling,
    scrollSpeed,
    isFullscreen,
    isUppercase,
    isBold,
    showAllSegments,
    containerRef,
    toggleScrolling,
    resetScroll,
    adjustFontSize,
    adjustScrollSpeed,
    toggleFullscreen,
    toggleUppercase,
    toggleBold,
    toggleShowAllSegments,
    getCurrentSpeed,
    isReverse
  } = useTeleprompterControls();

  // Use the scroll hook with reverse support
  useTeleprompterScroll(isScrolling, scrollSpeed, containerRef, isReverse());

  // Enhanced save system
  const { saveState, debouncedSave, forceSave, loadBackup } = useTeleprompterSave({
    rundownId: rundownId!,
    onSaveSuccess: (itemId, script) => {
      // Update local state immediately on successful save
      if (rundownData) {
        const updatedItems = rundownData.items.map(item =>
          item.id === itemId ? { ...item, script } : item
        );
        setRundownData({
          ...rundownData,
          items: updatedItems
        });
      }
    }
  });

  // Load rundown data with authentication and backup restoration
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
        const loadedData = {
          title: data.title || 'Untitled Rundown',
          items: data.items || []
        };
        
        // Check for and restore any backed up changes
        const backupData = loadBackup();
        if (Object.keys(backupData).length > 0) {
          // Restore backed up changes
          const restoredItems = loadedData.items.map((item: any) => {
            if (backupData[item.id]) {
              return { ...item, script: backupData[item.id] };
            }
            return item;
          });
          
          loadedData.items = restoredItems;
          
          toast.info('Restored unsaved changes from local backup', {
            duration: 4000,
            action: {
              label: 'Clear backup',
              onClick: () => {
                localStorage.removeItem(`teleprompter_backup_${rundownId}`);
                loadRundownData(); // Reload without backup
              }
            }
          });
        }
        
        setRundownData(loadedData);
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

  // Enhanced script update with robust saving
  const updateScriptContent = async (itemId: string, newScript: string) => {
    if (!rundownData || !user) return;

    // Pause polling during edit to prevent conflicts
    setIsPollingPaused(true);
    
    // Update local state immediately for responsiveness
    const updatedItems = rundownData.items.map(item =>
      item.id === itemId ? { ...item, script: newScript } : item
    );
    
    setRundownData({
      ...rundownData,
      items: updatedItems
    });

    // Use debounced save to prevent rapid-fire saves
    debouncedSave(itemId, newScript, { ...rundownData, items: updatedItems });
    
    // Resume polling after a delay
    setTimeout(() => {
      setIsPollingPaused(false);
    }, 3000);
  };

  // Print function with improved formatting
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

    // Generate HTML for print with proper page flow
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
              margin: 0;
              padding: 0;
            }
            body {
              font-family: Arial, sans-serif;
              color: black;
              background: white;
              line-height: 1.2;
              font-size: 12px;
            }
            .script-container {
              max-width: 100%;
            }
            .script-segment {
              margin-bottom: 1.5em;
              page-break-inside: avoid;
            }
            .segment-header {
              font-weight: bold;
              font-size: 11px;
              margin-bottom: 0.5em;
              page-break-after: avoid;
            }
            .segment-content {
              font-size: 12px;
              line-height: 1.2;
              margin-bottom: 0.5em;
              text-align: left;
            }
            .segment-content p {
              margin: 0 0 0.3em 0;
            }
            .segment-content p:last-child {
              margin-bottom: 0;
            }
            .header-segment {
              margin: 1em 0;
              page-break-after: avoid;
            }
            .header-segment .segment-header {
              font-size: 13px;
              font-weight: bold;
            }
            /* Remove forced page breaks to let content flow naturally */
            .page-break {
              margin-top: 2em;
            }
          </style>
        </head>
        <body>
          <div class="script-container">
            ${itemsWithScript.map((item, index) => {
              const rowNumber = getRowNumber(item.originalIndex);
              const isHeader = item.type === 'header';
              
              // For headers, show both the row number and the header name
              const title = isHeader 
                ? `${rowNumber} - ${formatText((item.name || item.segmentName || 'HEADER').toUpperCase())}`
                : `${rowNumber} - ${formatText((item.segmentName || item.name || 'UNTITLED').toUpperCase())}`;
              
              const scriptContent = processScriptForPrint(item.script || '');
              
              // Only add spacing break every 15 segments to allow better flow
              const needsSpacing = index > 0 && index % 15 === 0;
              
              return `
                <div class="script-segment ${isHeader ? 'header-segment' : ''} ${needsSpacing ? 'page-break' : ''}">
                  <div class="segment-header">[${title}]</div>
                  ${scriptContent ? `<div class="segment-content">${scriptContent.split('\n').map(line => {
                    const trimmedLine = line.trim();
                    return trimmedLine ? `<p>${trimmedLine}</p>` : '';
                  }).filter(p => p).join('')}</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </body>
      </html>
    `;

    // Write content and print
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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

  // Initial load
  useEffect(() => {
    loadRundownData();
  }, [rundownId, user]);

  // Enhanced polling with pause support
  useEffect(() => {
    if (!rundownId || loading || !user || isPollingPaused) return;
    
    const pollInterval = setInterval(() => {
      if (!isPollingPaused && !saveState.isSaving) {
        loadRundownData();
      }
    }, 8000); // Increased interval to 8 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [rundownId, loading, user, isPollingPaused, saveState.isSaving]);

  const getRowNumber = (index: number) => {
    if (!rundownData?.items || index < 0 || index >= rundownData.items.length) {
      return '';
    }
    
    const currentItem = rundownData.items[index];
    
    // Headers don't have row numbers
    if (currentItem?.type === 'header') {
      return '';
    }
    
    // For regular items, count sequentially ignoring headers
    let regularItemCount = 0;
    for (let i = 0; i <= index; i++) {
      if (rundownData.items[i]?.type !== 'header') {
        regularItemCount++;
      }
    }
    
    return regularItemCount.toString();
  };

  // Handle beforeunload to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveState.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveState.hasUnsavedChanges]);

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
        <>
          <TeleprompterControls
            isScrolling={isScrolling}
            fontSize={fontSize}
            scrollSpeed={getCurrentSpeed()}
            isUppercase={isUppercase}
            isBold={isBold}
            showAllSegments={showAllSegments}
            onToggleScrolling={toggleScrolling}
            onResetScroll={resetScroll}
            onToggleFullscreen={toggleFullscreen}
            onToggleUppercase={toggleUppercase}
            onToggleBold={toggleBold}
            onToggleShowAllSegments={toggleShowAllSegments}
            onAdjustFontSize={adjustFontSize}
            onAdjustScrollSpeed={adjustScrollSpeed}
            onPrint={handlePrint}
          />
          
          {/* Save Status Indicator */}
          <div className="fixed top-16 right-4 z-30">
            <TeleprompterSaveIndicator 
              saveState={saveState}
            />
          </div>
        </>
      )}

      {/* Content */}
      <TeleprompterContent
        containerRef={containerRef}
        isFullscreen={isFullscreen}
        itemsWithScript={itemsWithScript}
        fontSize={fontSize}
        isUppercase={isUppercase}
        isBold={isBold}
        getRowNumber={getRowNumber}
        onUpdateScript={updateScriptContent}
        canEdit={!isFullscreen}
      />

      {/* Simplified Keyboard Instructions - Only show when not fullscreen */}
      {!isFullscreen && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs p-3 rounded max-w-sm">
          <div className="space-y-1">
            <div>Enter Fullscreen for keyboard controls (Arrow Keys: Speed | Space: Play/Pause)</div>
            <div>Click on script text to edit</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teleprompter;
