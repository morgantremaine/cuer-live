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
import TeleprompterSidebar from '@/components/teleprompter/TeleprompterSidebar';
import TeleprompterConnectionWarning from '@/components/teleprompter/TeleprompterConnectionWarning';
import { useTeleprompterConnectionHealth } from '@/hooks/useTeleprompterConnectionHealth';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalTeleprompterSync } from '@/hooks/useGlobalTeleprompterSync';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { getTabId } from '@/utils/tabUtils';
import { toast } from 'sonner';
import { printRundownScript } from '@/utils/scriptPrint';
import { calculateItemsWithTiming } from '@/utils/rundownCalculations';

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
    startTime?: string;
    numberingLocked?: boolean;
    lockedRowNumbers?: Record<string, string>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSeenDocVersion, setLastSeenDocVersion] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
    isBlackout,
    containerRef,
    toggleScrolling,
    resetScroll,
    adjustFontSize,
    adjustScrollSpeed,
    toggleFullscreen,
    toggleUppercase,
    toggleBold,
    toggleShowAllSegments,
    toggleBlackout,
    getCurrentSpeed,
    isReverse
  } = useTeleprompterControls();

  // Use the scroll hook with reverse support
  useTeleprompterScroll(isScrolling, scrollSpeed, containerRef, isReverse());

  // Auto-scroll to item functionality
  const scrollToItem = (itemId: string) => {
    if (!containerRef.current) return;
    
    const element = containerRef.current.querySelector(`[data-item-id="${itemId}"]`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  // Update browser tab title when rundown title changes
  useEffect(() => {
    if (rundownData?.title && rundownData.title !== 'Untitled Rundown') {
      document.title = `${rundownData.title} - Teleprompter`;
    } else {
      document.title = 'Cuer';
    }

    // Cleanup: reset title when component unmounts
    return () => {
      document.title = 'Cuer';
    };
  }, [rundownData?.title]);

  // Simplified: No tab tracking needed with single sessions

  // Enhanced real-time updates with doc version tracking
  const { isConnected: isRealtimeConnected, trackOwnUpdate } = useConsolidatedRealtimeRundown({
    rundownId: rundownId!,
    enabled: !!rundownId && !!user && !!rundownData,
    lastSeenDocVersion,
    onRundownUpdate: (updatedRundown) => {
      // Always accept remote updates to ensure real-time sync
      if (updatedRundown) {
        console.log('📥 Teleprompter receiving real-time update from team');
        setRundownData(prev => {
          const startTime = prev?.startTime || '09:00:00';
          // Use new lock values from consolidated update if present, otherwise fall back to previous
          const numberingLocked = updatedRundown.numbering_locked ?? prev?.numberingLocked ?? false;
          const lockedRowNumbers = updatedRundown.locked_row_numbers ?? prev?.lockedRowNumbers ?? {};
          
          // Recalculate timing and row numbers for received items
          const itemsWithCalculations = calculateItemsWithTiming(
            updatedRundown.items || [],
            startTime,
            numberingLocked,
            lockedRowNumbers
          );
          
          return {
            startTime,
            numberingLocked,
            lockedRowNumbers,
            title: updatedRundown.title || 'Untitled Rundown',
            items: itemsWithCalculations,
            doc_version: updatedRundown.doc_version,
            updated_at: updatedRundown.updated_at
          };
        });
        
        // Update doc version tracking
        if (updatedRundown.doc_version) {
          setLastSeenDocVersion(updatedRundown.doc_version);
        }
      }
    }
  });

  // Simplified: No tab-based refresh needed with single sessions
  // Data freshness maintained through realtime updates only

  // Enhanced save system with realtime collaboration
  const { saveState, debouncedSave, forceSave, loadBackup } = useTeleprompterSave({
    rundownId: rundownId!,
    onSaveSuccess: (itemId, script) => {
      console.log('📝 Teleprompter: Save success callback - updating local state and broadcasting', { itemId });
      
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
      
      // Broadcast the change for real-time collaboration AFTER successful save
      if (user) {
        console.log('📡 Teleprompter: Broadcasting cell update for real-time collaboration', { itemId, scriptLength: script.length });
        cellBroadcast.broadcastCellUpdate(rundownId!, itemId, 'script', script, user.id, getTabId());
      } else {
        console.log('⚠️ Teleprompter: No user found, skipping cell broadcast');
      }
    },
    onSaveStart: globalTeleprompterSync.handleTeleprompterSaveStart,
    onSaveEnd: globalTeleprompterSync.handleTeleprompterSaveEnd
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
          items: data.items || [],
          startTime: data.startTime || '00:00:00'
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
        
        // Calculate timing and row numbers client-side for accuracy
        const itemsWithCalculations = calculateItemsWithTiming(
          loadedData.items,
          loadedData.startTime,
          data.numbering_locked,
          data.locked_row_numbers
        );
        
        loadedData.items = itemsWithCalculations;
        
        setRundownData({
          ...loadedData,
          numberingLocked: data.numbering_locked,
          lockedRowNumbers: data.locked_row_numbers
        });
        setError(null);
        
        // Initialize doc version tracking
        if (data.doc_version) {
          setLastSeenDocVersion(data.doc_version);
        }
        
        // Watchdog removed - relying on useConsolidatedRealtimeRundown for reliable sync
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

  // Silent refresh for connection health recovery (no loading state)
  const silentRefreshData = async () => {
    if (!rundownId) return;
    
    try {
      const { data, error: queryError } = await supabase
        .rpc('get_public_rundown_data', { rundown_uuid: rundownId });

      if (!queryError && data) {
        const refreshedData = {
          title: data.title || 'Untitled Rundown',
          items: data.items || [],
          startTime: data.startTime || '00:00:00',
          numberingLocked: data.numbering_locked,
          lockedRowNumbers: data.locked_row_numbers
        };
        
        // Calculate timing and row numbers
        const itemsWithCalculations = calculateItemsWithTiming(
          refreshedData.items,
          refreshedData.startTime,
          refreshedData.numberingLocked,
          refreshedData.lockedRowNumbers
        );
        
        refreshedData.items = itemsWithCalculations;
        
        // Only update if content actually changed (preserve scroll position)
        setRundownData(prev => {
          if (!prev) return refreshedData;
          const prevItemsJson = JSON.stringify(prev.items.map(i => ({ id: i.id, script: i.script, name: i.name })));
          const newItemsJson = JSON.stringify(refreshedData.items.map((i: any) => ({ id: i.id, script: i.script, name: i.name })));
          if (prevItemsJson !== newItemsJson) {
            console.log('📺 Teleprompter: Silent refresh detected content changes');
            return refreshedData;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('📺 Teleprompter: Silent refresh failed:', error);
    }
  };

  // Connection health monitoring for bulletproof teleprompter
  const { showConnectionWarning, markBroadcastReceived } = useTeleprompterConnectionHealth({
    rundownId: rundownId || '',
    enabled: !!rundownId,
    onSilentRefresh: silentRefreshData,
    staleThresholdMs: 180000,      // 3 minutes
    healthCheckIntervalMs: 180000  // 3 minutes
  });

  // Set up cell broadcast for instant collaboration (per-tab, not per-user)
  useEffect(() => {
    if (!rundownId) return;
    
    const unsubscribe = cellBroadcast.subscribeToCellUpdates(rundownId, (update) => {
      // Only process cell value updates, not focus events
      if ('isFocused' in update) return;
      if (!('value' in update)) return;
      
      // Skip own updates using tab ID for correct echo prevention
      const currentTabId = getTabId();
      if (cellBroadcast.isOwnUpdate(update, currentTabId)) {
        return;
      }
      
      // Mark that we received a broadcast (for health monitoring)
      markBroadcastReceived();

      // Handle structural events for instant collaboration (add/remove/reorder/copy/lock_state)
      if (update.field === 'items:add' || update.field === 'items:remove' || update.field === 'items:remove-multiple' || update.field === 'items:reorder' || update.field === 'items:copy' || update.field === 'lock_state') {
        setRundownData(prev => {
          if (!prev) return prev;

          if (update.field === 'items:add') {
            const payload = update.value || {};
            const item = payload.item;
            const index = Math.max(0, Math.min(payload.index ?? prev.items.length, prev.items.length));
            if (item && !prev.items.find(i => i.id === item.id)) {
              const newItems = [...prev.items];
              newItems.splice(index, 0, item);
              
              // Recalculate timing and row numbers
              const itemsWithCalculations = calculateItemsWithTiming(
                newItems,
                prev.startTime || '09:00:00',
                prev.numberingLocked || false,
                prev.lockedRowNumbers || {}
              );
              
              return { ...prev, items: itemsWithCalculations };
            }
            return prev;
          }

          if (update.field === 'items:remove') {
            const id = update.value?.id as string;
            if (id) {
              const newItems = prev.items.filter(i => i.id !== id);
              if (newItems.length !== prev.items.length) {
                // Recalculate timing and row numbers
                const itemsWithCalculations = calculateItemsWithTiming(
                  newItems,
                  prev.startTime || '09:00:00',
                  prev.numberingLocked || false,
                  prev.lockedRowNumbers || {}
                );
                return { ...prev, items: itemsWithCalculations };
              }
            }
            return prev;
          }

          if (update.field === 'items:remove-multiple') {
            const ids = update.value?.ids as string[];
            if (ids && Array.isArray(ids) && ids.length > 0) {
              const newItems = prev.items.filter(i => !ids.includes(i.id));
              if (newItems.length !== prev.items.length) {
                const itemsWithCalculations = calculateItemsWithTiming(
                  newItems,
                  prev.startTime || '09:00:00',
                  prev.numberingLocked || false,
                  prev.lockedRowNumbers || {}
                );
                return { ...prev, items: itemsWithCalculations };
              }
            }
            return prev;
          }

          if (update.field === 'items:reorder') {
            const order: string[] = Array.isArray(update.value?.order) ? update.value.order : [];
            if (order.length > 0) {
              const indexMap = new Map(order.map((id, idx) => [id, idx]));
              const reordered = [...prev.items].sort((a, b) => {
                const ai = indexMap.has(a.id) ? (indexMap.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
                const bi = indexMap.has(b.id) ? (indexMap.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
                return ai - bi;
              });
              
              // Recalculate timing and row numbers
              const itemsWithCalculations = calculateItemsWithTiming(
                reordered,
                prev.startTime || '09:00:00',
                prev.numberingLocked || false,
                prev.lockedRowNumbers || {}
              );
              
              return { ...prev, items: itemsWithCalculations };
            }
            return prev;
          }

          if (update.field === 'items:copy') {
            const payload = update.value || {};
            const items = payload.items || [];
            const index = Math.max(0, Math.min(payload.index ?? prev.items.length, prev.items.length));
            
            if (items.length > 0) {
              // Filter out duplicates (in case item already exists)
              const newItemsToAdd = items.filter((item: RundownItem) => 
                !prev.items.find(i => i.id === item.id)
              );
              
              if (newItemsToAdd.length > 0) {
                const newItems = [...prev.items];
                newItems.splice(index, 0, ...newItemsToAdd);
                
                // Recalculate timing and row numbers using the shared calculation function
                const itemsWithCalculations = calculateItemsWithTiming(
                  newItems,
                  prev.startTime || '09:00:00',
                  prev.numberingLocked || false,
                  prev.lockedRowNumbers || {}
                );
                
                return { 
                  ...prev, 
                  items: itemsWithCalculations 
                };
              }
            }
            return prev;
          }

          if (update.field === 'lock_state') {
            const { numberingLocked, lockedRowNumbers } = update.value || {};
            // Recalculate items with new lock settings
            const itemsWithCalculations = calculateItemsWithTiming(
              prev.items,
              prev.startTime || '09:00:00',
              numberingLocked ?? prev.numberingLocked ?? false,
              lockedRowNumbers ?? prev.lockedRowNumbers ?? {}
            );
            return { 
              ...prev, 
              items: itemsWithCalculations,
              numberingLocked: numberingLocked ?? prev.numberingLocked,
              lockedRowNumbers: lockedRowNumbers ?? prev.lockedRowNumbers
            };
          }

          return prev;
        });
        return;
      }

      // Handle script, name, and isFloating field updates for teleprompter
      if (update.itemId && (update.field === 'script' || update.field === 'name' || update.field === 'isFloating')) {
        // Check if actively editing this field (not applicable to isFloating)
        const isActivelyEditing = typingSessionRef.current?.fieldKey === `${update.itemId}-${update.field}`;
        if (isActivelyEditing) {
          return;
        }

        setRundownData(prev => {
          if (!prev) return prev;
          const updatedItems = prev.items.map(item => {
            if (item.id === update.itemId) {
              // Handle isFloating boolean conversion (broadcast sends 'true'/'false' strings)
              if (update.field === 'isFloating') {
                return { ...item, isFloating: update.value === 'true' };
              }
              return { ...item, [update.field]: update.value };
            }
            return item;
          });
          
          // Recalculate timing/row numbers if isFloating changed (affects numbering sequence)
          if (update.field === 'isFloating') {
            const itemsWithCalculations = calculateItemsWithTiming(
              updatedItems,
              prev.startTime || '09:00:00',
              prev.numberingLocked || false,
              prev.lockedRowNumbers || {}
            );
            return { ...prev, items: itemsWithCalculations };
          }
          
          return { ...prev, items: updatedItems };
        });
      } else if (!update.itemId) {
        // Rundown-level updates (title changes, etc.)
        setRundownData(prev => (prev ? { ...prev, [update.field]: update.value } : prev));
      }
    }, getTabId());

    return unsubscribe;
  }, [rundownId, user?.id, markBroadcastReceived]);

  // Enhanced script update with instant cell broadcast (per-tab, not per-user)
  const updateScriptContent = async (itemId: string, newScript: string) => {
    if (!rundownData) return;
    
    // Track typing session for conflict protection
    recentlyEditedFieldsRef.current.set(`${itemId}-script`, Date.now());
    typingSessionRef.current = { fieldKey: `${itemId}-script`, startTime: Date.now() };
    
    // Broadcast script change instantly for real-time collaboration (per-tab using clientId)
    if (rundownId && user?.id) {
      cellBroadcast.broadcastCellUpdate(rundownId, itemId, 'script', newScript, user.id, getTabId());
    }
    
    // Update local state immediately for responsiveness
    const updatedItems = rundownData.items.map(item =>
      item.id === itemId ? { ...item, script: newScript } : item
    );
    
    setRundownData({
      ...rundownData,
      items: updatedItems
    });

    // Use immediate tracking - let per-cell save system handle debouncing
    debouncedSave(itemId, newScript);
    
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

    printRundownScript(rundownData.title, rundownData.items, { isUppercase, showAllSegments });
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
  }, [rundownId, user?.id]);

  // Remove polling - now using realtime updates for instant synchronization
  // Polling is no longer needed with realtime collaboration

  const getRowNumber = (index: number) => {
    if (!rundownData?.items || index < 0 || index >= rundownData.items.length) {
      return '';
    }
    
    const currentItem = rundownData.items[index];
    
    // Headers and floating items don't have row numbers
    if (currentItem?.type === 'header' || currentItem?.isFloating || currentItem?.isFloated) {
      return '';
    }
    
    // Use the calculated rowNumber from calculateItemsWithTiming
    return (currentItem as any).calculatedRowNumber || '';
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
      <div className="dark min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading teleprompter...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dark min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-2">Error loading teleprompter</div>
          <div className="text-gray-400 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!rundownData) {
    return (
      <div className="dark min-h-screen bg-black flex items-center justify-center">
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
    <div className="dark min-h-screen bg-black text-white overflow-hidden">
      {/* Connection warning for fullscreen mode */}
      <TeleprompterConnectionWarning 
        show={showConnectionWarning} 
        isFullscreen={isFullscreen} 
      />
      
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
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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

      {/* Layout Container for Sidebar and Content */}
      <div className={`flex ${isFullscreen ? '' : 'pt-[73px]'}`}>
        {/* Sidebar - only show in non-fullscreen mode */}
        {!isFullscreen && (
          <TeleprompterSidebar
            items={itemsWithScript}
            getRowNumber={getRowNumber}
            onItemClick={scrollToItem}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        )}

        {/* Content */}
        <div className="flex-1">
          <TeleprompterContent
            containerRef={containerRef}
            isFullscreen={isFullscreen}
            itemsWithScript={itemsWithScript}
            fontSize={fontSize}
            isUppercase={isUppercase}
            isBold={isBold}
            isBlackout={isBlackout}
            getRowNumber={getRowNumber}
            onUpdateScript={user ? updateScriptContent : undefined}
            canEdit={!!user && !isFullscreen}
          />
        </div>
      </div>
    </div>
  );
};

export default Teleprompter;
