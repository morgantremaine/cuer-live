import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';
import { useTeleprompterControls } from '@/hooks/useTeleprompterControls';
import { useTeleprompterScroll } from '@/hooks/useTeleprompterScroll';
import { useTeleprompterSave } from '@/hooks/useTeleprompterSave';
import { useSimpleRealtimeRundown } from '@/hooks/useSimpleRealtimeRundown';
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

  // Update browser tab title when rundown title changes
  useEffect(() => {
    if (rundownData?.title && rundownData.title !== 'Untitled Rundown') {
      document.title = `${rundownData.title} - Teleprompter`;
    } else {
      document.title = 'Cuer Live';
    }

    // Cleanup: reset title when component unmounts
    return () => {
      document.title = 'Cuer Live';
    };
  }, [rundownData?.title]);

  // Add realtime updates for instant script synchronization
  const { isConnected: isRealtimeConnected, trackOwnUpdate } = useSimpleRealtimeRundown({
    rundownId: rundownId!,
    enabled: !!rundownId && !!user && !!rundownData,
    onRundownUpdate: (updatedRundown) => {
      if (updatedRundown && !saveState?.isSaving) {
        setRundownData({
          title: updatedRundown.title || 'Untitled Rundown',
          items: updatedRundown.items || []
        });
      }
    }
  });

  // Enhanced save system with realtime collaboration
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

  // Load rundown data with optional authentication (read-only if not authenticated)
  const loadRundownData = async () => {
    if (!rundownId) {
      setLoading(false);
      setError('No rundown ID provided');
      return;
    }

    setError(null);

    try {
      // Access rundown (works for both authenticated and public access)
      const { data, error: queryError } = await supabase
        .from('rundowns')
        .select('id, title, items, columns, created_at, updated_at')
        .eq('id', rundownId)
        .maybeSingle();

      if (queryError) {
        console.error('Database error:', queryError);
        setError(`Unable to load rundown: ${queryError.message}`);
        setRundownData(null);
      } else if (data) {
        const loadedData = {
          title: data.title || 'Untitled Rundown',
          items: data.items || []
        };
        
        // Check for and restore any backed up changes (only for authenticated users)
        if (user) {
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

  // Enhanced script update with realtime collaboration (only for authenticated users)
  const updateScriptContent = async (itemId: string, newScript: string) => {
    if (!rundownData || !user) return;
    
    // Update local state immediately for responsiveness
    const updatedItems = rundownData.items.map(item =>
      item.id === itemId ? { ...item, script: newScript } : item
    );
    
    setRundownData({
      ...rundownData,
      items: updatedItems
    });

    // Use faster debounced save (500ms instead of 1500ms)
    debouncedSave(itemId, newScript, { ...rundownData, items: updatedItems }, 500);
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
      // Keep brackets but remove color indicators: [Caster{blue}] becomes [Caster]
      const cleanText = text.replace(/\[([^\[\]{}]+)(?:\{[^}]+\})?\]/g, '[$1]');
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
            }
            body {
              font-family: Arial, sans-serif;
              color: black;
              background: white;
              line-height: 1.4;
              font-size: 14px;
              margin: 0;
              padding: 0;
            }
            .script-container {
              max-width: 100%;
            }
            .script-item {
              margin-bottom: 2em;
              page-break-inside: avoid;
            }
            .segment-header {
              font-weight: bold;
              font-size: 12px;
              margin-bottom: 0.75em;
              page-break-after: avoid;
              color: #333;
            }
            .script-content {
              font-size: 14px;
              line-height: 1.4;
              text-align: left;
              white-space: pre-wrap;
            }
            .header-item {
              margin: 2em 0 1.5em 0;
            }
            .header-item .segment-header {
              font-size: 14px;
              font-weight: bold;
              color: #000;
            }
          </style>
        </head>
        <body>
          <div class="script-container">
            ${itemsWithScript.map((item) => {
              const rowNumber = getRowNumber(item.originalIndex);
              const isHeader = item.type === 'header';
              
              // For headers, show both the row number and the header name
              const title = isHeader 
                ? `${rowNumber} - ${formatText((item.name || item.segmentName || 'HEADER').toUpperCase())}`
                : `${rowNumber} - ${formatText((item.segmentName || item.name || 'UNTITLED').toUpperCase())}`;
              
              const scriptContent = processScriptForPrint(item.script || '');
              
              return `
                <div class="script-item ${isHeader ? 'header-item' : ''}">
                  <div class="segment-header">[${title}]</div>
                  ${scriptContent ? `<div class="script-content">${scriptContent}</div>` : ''}
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
    // Exclude floated items from teleprompter
    if (item.isFloating || item.isFloated) {
      return false;
    }
    
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
  }, [rundownId]);

  // Remove polling - now using realtime updates for instant synchronization
  // Polling is no longer needed with realtime collaboration

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
      {/* Read-only banner for non-authenticated users */}
      {!user && (
        <div className="bg-blue-600 text-white text-center py-2 text-sm">
          Read-only mode - <a href="/login" className="underline hover:text-blue-200">Sign in</a> to edit teleprompter content
        </div>
      )}
      
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
          
          {/* Save Status Indicator - only show for authenticated users */}
          {user && (
            <div className="fixed top-16 right-4 z-30">
              <TeleprompterSaveIndicator 
                saveState={saveState}
              />
            </div>
          )}
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
        canEdit={!isFullscreen && !!user}
      />

    </div>
  );
};

export default Teleprompter;
