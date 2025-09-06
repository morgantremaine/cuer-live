import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { useTeleprompterControls } from '@/hooks/useTeleprompterControls';
import { useTeleprompterScroll } from '@/hooks/useTeleprompterScroll';
import { useTeleprompterSave } from '@/hooks/useTeleprompterSave';
import { useConsolidatedRealtimeRundown } from '@/hooks/useConsolidatedRealtimeRundown';
import TeleprompterControls from '@/components/teleprompter/TeleprompterControls';
import TeleprompterContent from '@/components/teleprompter/TeleprompterContent';
import TeleprompterSaveIndicator from '@/components/teleprompter/TeleprompterSaveIndicator';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalTeleprompterSync } from '@/hooks/useGlobalTeleprompterSync';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { toast } from 'sonner';
import { RealtimeWatchdog } from '@/utils/realtimeWatchdog';

const Teleprompter = () => {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const rundownId = params.id;
  
  // Global teleprompter sync for blue Wi-Fi indicator in main rundown
  const globalTeleprompterSync = useGlobalTeleprompterSync();
  
  const [rundownData, setRundownData] = useState<{
    title: string;
    items: RundownItem[];
    doc_version?: number;
    updated_at?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSeenDocVersion, setLastSeenDocVersion] = useState(0);
  const watchdogRef = useRef<RealtimeWatchdog | null>(null);
  const recentlyEditedFieldsRef = useRef<Map<string, number>>(new Map());
  const typingSessionRef = useRef<{ fieldKey: string; startTime: number } | null>(null);

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

  // Track tab visibility/focus for silent refresh functionality
  const [isTabActive, setIsTabActive] = useState(true);
  const lastSyncTimeRef = useRef(0);
  const prevIsActiveRef = useRef(true);

  // Enhanced real-time updates with doc version tracking
  const { isConnected: isRealtimeConnected, trackOwnUpdate } = useConsolidatedRealtimeRundown({
    rundownId: rundownId!,
    enabled: !!rundownId && !!user && !!rundownData,
    lastSeenDocVersion,
    onRundownUpdate: (updatedRundown) => {
      // Always accept remote updates to ensure real-time sync
      if (updatedRundown) {
        console.log('📥 Teleprompter receiving real-time update from team');
        setRundownData({
          title: updatedRundown.title || 'Untitled Rundown',
          items: updatedRundown.items || [],
          doc_version: updatedRundown.doc_version, // Include doc_version for optimistic concurrency
          updated_at: updatedRundown.updated_at
        });
        
        // Update doc version tracking
        if (updatedRundown.doc_version) {
          setLastSeenDocVersion(updatedRundown.doc_version);
          watchdogRef.current?.updateLastSeen(updatedRundown.doc_version, updatedRundown.updated_at);
        }
      }
    }
  });

  // Silent refresh when tab becomes active (same as main rundown)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };
    
    const handleFocusChange = () => {
      setIsTabActive(document.hasFocus());
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocusChange);
    window.addEventListener('blur', handleFocusChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocusChange);
      window.removeEventListener('blur', handleFocusChange);
    };
  }, []);

  // Perform silent refresh when tab becomes active
  useEffect(() => {
    if (!rundownId || !user) return;

    // Only trigger on active transitions (not when going inactive)
    const shouldSync = isTabActive && !prevIsActiveRef.current;
    prevIsActiveRef.current = isTabActive;

    if (!shouldSync) return;

    // Debounce rapid focus/visibility flaps
    const now = Date.now();
    const timeSinceLast = now - lastSyncTimeRef.current;
    if (timeSinceLast <= 300) return;

    lastSyncTimeRef.current = now;
    console.log('👁️ Teleprompter tab active - performing silent refresh for latest rundown');

    const performSilentRefresh = async () => {
      try {
        const { data, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', rundownId)
          .single();
        
        if (!error && data) {
          console.log('🔄 Teleprompter silent refresh: applying newer data from server', {
            serverDoc: data.doc_version,
            serverTs: data.updated_at
          });
          
          setRundownData({
            title: data.title || 'Untitled Rundown',
            items: data.items || [],
            doc_version: data.doc_version,
            updated_at: data.updated_at
          });
          
          if (data.doc_version) {
            setLastSeenDocVersion(data.doc_version);
            watchdogRef.current?.updateLastSeen(data.doc_version, data.updated_at);
          }
        }
      } catch (error) {
        console.warn('⚠️ Teleprompter silent refresh failed:', error);
      }
    };

    performSilentRefresh();
  }, [isTabActive, rundownId, user]);

  // Set up cell broadcast for instant collaboration
  useEffect(() => {
    if (!rundownId || !user?.id) return;

    const unsubscribe = cellBroadcast.subscribeToCellUpdates(rundownId, (update) => {
      // Skip own updates (per-tab, not per-user)
      if (cellBroadcast.isOwnUpdate(update)) {
        console.log('📱 Teleprompter skipping own cell broadcast update');
        return;
      }

      // Only handle script field updates for teleprompter
      if (update.itemId && update.field === 'script') {
        // Check if actively editing this field
        const isActivelyEditing = typingSessionRef.current?.fieldKey === `${update.itemId}-script`;
        if (isActivelyEditing) {
          console.log('🛡️ Teleprompter skipping cell broadcast - actively editing:', update.itemId, update.field);
          return;
        }

        console.log('📱 Teleprompter applying cell broadcast script update:', update.itemId, update.value);
        
        // Apply the script update immediately
        if (rundownData) {
          const updatedItems = rundownData.items.map(item =>
            item.id === update.itemId ? { ...item, script: update.value } : item
          );
          setRundownData({
            ...rundownData,
            items: updatedItems
          });
        }
      }
    });

    return unsubscribe;
  }, [isTabActive, rundownId, user]);

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
    },
    onSaveStart: globalTeleprompterSync.handleTeleprompterSaveStart,
    onSaveEnd: globalTeleprompterSync.handleTeleprompterSaveEnd,
    // CRITICAL: Pass trackOwnUpdate to integrate with real-time system
    trackOwnUpdate: trackOwnUpdate
  });

  // Enhanced rundown data loading with doc version tracking
  const loadRundownData = async () => {
    if (!rundownId) {
      setLoading(false);
      setError('No rundown ID provided');
      return;
    }

    setError(null);

    try {
      // Use the enhanced RPC function for better data access
      const { data, error: queryError } = await supabase
        .rpc('get_public_rundown_data', { rundown_uuid: rundownId });

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
        
        // Initialize doc version tracking
        if (data.doc_version) {
          setLastSeenDocVersion(data.doc_version);
        }
        
        // Initialize watchdog for reliable sync
        if (user?.id) {
          watchdogRef.current = RealtimeWatchdog.getInstance(rundownId, user.id, {
            onStaleData: (latestData) => {
              console.log('🔄 Teleprompter watchdog detected stale data, refreshing');
              setRundownData({
                title: latestData.title || 'Untitled Rundown',
                items: latestData.items || []
              });
              if (latestData.doc_version) {
                setLastSeenDocVersion(latestData.doc_version);
              }
            }
          });
          watchdogRef.current.start();
        }
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

  // Enhanced script update with instant cell broadcast
  const updateScriptContent = async (itemId: string, newScript: string) => {
    if (!rundownData || !user) return;
    
    // Track typing session for conflict protection
    recentlyEditedFieldsRef.current.set(`${itemId}-script`, Date.now());
    typingSessionRef.current = { fieldKey: `${itemId}-script`, startTime: Date.now() };
    
    // Broadcast script change instantly for real-time collaboration
    if (rundownId && user?.id) {
      cellBroadcast.broadcastCellUpdate(rundownId, itemId, 'script', newScript, user.id);
    }
    
    // Update local state immediately for responsiveness
    const updatedItems = rundownData.items.map(item =>
      item.id === itemId ? { ...item, script: newScript } : item
    );
    
    setRundownData({
      ...rundownData,
      items: updatedItems
    });

    // Use debounced save for persistence (500ms)
    debouncedSave(itemId, newScript, { ...rundownData, items: updatedItems }, 500);
    
    // Clear typing session after delay
    setTimeout(() => {
      if (typingSessionRef.current?.fieldKey === `${itemId}-script`) {
        typingSessionRef.current = null;
      }
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

    // Helper function to process script text for print with colored brackets
    const processScriptForPrint = (text: string) => {
      // Handle [null] case (case-insensitive) - don't show any script content in print
      if (text.trim().toLowerCase() === '[null]') {
        return '';
      }

      const bracketRegex = /\[([^\[\]{}]+)(?:\{([^}]+)\})?\]/g;
      
      let result = '';
      let lastIndex = 0;
      let match;

      while ((match = bracketRegex.exec(text)) !== null) {
        // Add text before the bracket
        if (match.index > lastIndex) {
          result += formatText(text.slice(lastIndex, match.index));
        }

        const bracketText = match[1];
        const colorName = match[2]?.toLowerCase();

        if (colorName) {
          // Apply color for brackets with custom colors
          const colorMap: { [key: string]: string } = {
            'red': '#ef4444',
            'blue': '#3b82f6',
            'green': '#22c55e',
            'yellow': '#eab308',
            'purple': '#a855f7',
            'orange': '#f97316',
            'pink': '#ec4899',
            'gray': '#6b7280',
            'grey': '#6b7280',
            'cyan': '#06b6d4',
            'lime': '#84cc16',
            'indigo': '#6366f1',
            'teal': '#14b8a6',
            'amber': '#f59e0b',
            'emerald': '#10b981',
            'violet': '#8b5cf6',
            'rose': '#f43f5e',
            'slate': '#64748b',
            'stone': '#78716c',
            'neutral': '#737373',
            'zinc': '#71717a'
          };
          
          const backgroundColor = colorMap[colorName] || colorName;
          result += `<span style="background-color: ${backgroundColor}; color: white; padding: 2px 6px; border-radius: 3px; margin: 0 2px;">${formatText(bracketText)}</span>`;
        } else {
          // Keep normal brackets as text
          result += `[${formatText(bracketText)}]`;
        }

        lastIndex = bracketRegex.lastIndex;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        result += formatText(text.slice(lastIndex));
      }

      return result;
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
                margin: 0.5in;
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
              line-height: 1.5;
              font-size: 14px;
              margin: 0;
              padding: 0;
            }
            .script-container {
              max-width: 100%;
              width: 100%;
            }
            .script-item {
              margin-bottom: 1.5em;
              break-inside: avoid-column;
            }
            .segment-header {
              font-weight: bold;
              font-size: 13px;
              margin-bottom: 0.5em;
              color: #333;
              break-after: avoid;
            }
            .script-content {
              font-size: 14px;
              line-height: 1.5;
              text-align: left;
              white-space: pre-wrap;
              margin-bottom: 0;
            }
            .header-item {
              margin: 1.5em 0 1em 0;
            }
            .header-item .segment-header {
              font-size: 14px;
              font-weight: bold;
              color: #000;
            }
            /* Ensure no orphaned headers */
            .script-item:last-child {
              margin-bottom: 0;
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

  // Initial load with cleanup
  useEffect(() => {
    loadRundownData();
    
    return () => {
      if (watchdogRef.current && user?.id) {
        watchdogRef.current.stop();
        RealtimeWatchdog.cleanup(rundownId || '', user.id);
        watchdogRef.current = null;
      }
    };
  }, [rundownId, user?.id]);

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
