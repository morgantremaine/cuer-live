import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardHeader from '@/components/DashboardHeader';
import BlueprintHeader from '@/components/blueprint/BlueprintHeader';
import BlueprintEmptyState from '@/components/blueprint/BlueprintEmptyState';
import BlueprintListsGrid from '@/components/blueprint/BlueprintListsGrid';
import BlueprintScratchpad from '@/components/blueprint/BlueprintScratchpad';
import CameraPlot from '@/components/blueprint/CameraPlot';
import { BlueprintProvider, useBlueprintContext } from '@/contexts/BlueprintContext';
import { getAvailableColumns, generateListFromColumn } from '@/utils/blueprintUtils';
import { createDefaultRundownItems } from '@/data/defaultRundownItems';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

const BlueprintLoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-900">
    <DashboardHeader 
      userEmail=""
      onSignOut={() => {}} 
      showBackButton={true}
      onBack={() => {}}
    />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-64 bg-gray-700" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-32 bg-gray-700" />
            <Skeleton className="h-10 w-40 bg-gray-700" />
            <Skeleton className="h-10 w-28 bg-gray-700" />
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 w-full bg-gray-700" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const BlueprintContent = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  // Use BlueprintContext directly - single source of truth
  const {
    state,
    updateLists,
    addList,
    deleteList,
    renameList,
    updateCheckedItems,
    updateShowDate,
    updateComponentOrder,
    autoRefreshLists,
    rundownData // Get rundown data from context
  } = useBlueprintContext();

  // Get available columns from context rundown items
  const availableColumns = React.useMemo(() => {
    if (!rundownData?.items) return [];
    return getAvailableColumns(rundownData.items);
  }, [rundownData?.items]);

  // Add new list
  const addNewList = React.useCallback((name: string, sourceColumn: string) => {
    logger.blueprint('Adding new list:', { name, sourceColumn });
    
    if (!rundownData?.items) return;
    
    const newList = {
      id: `${sourceColumn}_${Date.now()}`,
      name,
      sourceColumn,
      items: generateListFromColumn(rundownData.items, sourceColumn),
      checkedItems: {}
    };
    
    logger.blueprint('Generated new list:', newList);
    addList(newList);
  }, [rundownData?.items, addList]);

  // Refresh all lists - now using the context's autoRefreshLists
  const refreshAllLists = React.useCallback(() => {
    logger.blueprint('Manual refresh all lists triggered');
    if (!rundownData?.items) {
      logger.blueprint('No rundown items available for refresh');
      return;
    }
    
    autoRefreshLists(rundownData.items);
  }, [rundownData?.items, autoRefreshLists]);

  // Toggle unique items display
  const toggleUniqueItems = React.useCallback((listId: string, showUnique: boolean) => {
    logger.blueprint('BlueprintContent: toggleUniqueItems called for list', { listId, showUnique });
    
    const updatedLists = state.lists.map(list => 
      list.id === listId ? { ...list, showUniqueOnly: showUnique } : list
    );
    
    logger.blueprint('BlueprintContent: updating lists with showUniqueOnly toggle');
    updateLists(updatedLists);
  }, [state.lists, updateLists]);

  // Drag and drop state for lists and components
  const [draggedListId, setDraggedListId] = React.useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = React.useState<number | null>(null);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    logger.blueprint('Drag start:', itemId);
    setDraggedListId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
    // Don't add opacity class here as it's handled by the card component
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnterContainer = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedListId) {
      logger.blueprint('Drag enter container at index:', { index, draggedListId });
      setInsertionIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const container = document.querySelector('[data-drop-container]');
    if (container && !container.contains(e.relatedTarget as Node)) {
      setInsertionIndex(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    
    const draggedId = e.dataTransfer.getData('text/plain');
    logger.blueprint('Drop event:', { draggedId, insertionIndex });
    
    if (!draggedId || insertionIndex === null) {
      setDraggedListId(null);
      setInsertionIndex(null);
      return;
    }

    // Handle special components reordering (removed crew-list references)
    if (draggedId === 'camera-plot' || draggedId === 'scratchpad') {
      const currentComponentOrder = [...state.componentOrder];
      const draggedIndex = currentComponentOrder.indexOf(draggedId);
      
      if (draggedIndex !== -1) {
        // Remove from current position
        currentComponentOrder.splice(draggedIndex, 1);
        
        // Calculate insertion position relative to component order
        let targetPosition = insertionIndex - state.lists.length;
        if (targetPosition < 0) targetPosition = 0;
        if (targetPosition > currentComponentOrder.length) targetPosition = currentComponentOrder.length;
        
        // Insert at new position
        currentComponentOrder.splice(targetPosition, 0, draggedId);
        
        // Update the component order
        logger.blueprint('Updating component order:', currentComponentOrder);
        updateComponentOrder(currentComponentOrder);
      }
      
      setDraggedListId(null);
      setInsertionIndex(null);
      return;
    }

    // Handle list reordering
    const draggedIndex = state.lists.findIndex(list => list.id === draggedId);
    if (draggedIndex === -1) {
      setDraggedListId(null);
      setInsertionIndex(null);
      return;
    }

    const newLists = [...state.lists];
    const [draggedList] = newLists.splice(draggedIndex, 1);
    newLists.splice(insertionIndex, 0, draggedList);
    
    logger.blueprint('Reordered lists:', newLists.map(l => l.name));
    updateLists(newLists);

    setDraggedListId(null);
    setInsertionIndex(null);
  };

  const handleDragEnd = () => {
    logger.blueprint('Drag end');
    setDraggedListId(null);
    setInsertionIndex(null);
    
    // Remove visual feedback
    document.querySelectorAll('.opacity-50').forEach(el => {
      el.classList.remove('opacity-50');
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      navigate('/login')
    }
  }

  const handleBack = () => {
    const isDemoMode = rundownData?.id === 'demo';
    if (isDemoMode) {
      navigate('/demo');
    } else {
      navigate('/dashboard');
    }
  };

  // Create component mapping for rendering in the correct order (removed crew-list)
  const componentMap = {
    'camera-plot': (
      <div 
        key="camera-plot"
        className={`${draggedListId === 'camera-plot' ? 'opacity-50' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart(e, 'camera-plot')}
        onDragEnter={(e) => {
          e.preventDefault();
          const componentIndex = state.lists.length + state.componentOrder.indexOf('camera-plot');
          handleDragEnterContainer(e, componentIndex);
        }}
        onDragEnd={handleDragEnd}
      >
        <CameraPlot
          rundownId={rundownData?.id || ''}
          rundownTitle={rundownData?.title || 'Unknown Rundown'}
          isDragging={draggedListId === 'camera-plot'}
          onDragStart={handleDragStart}
          onDragEnterContainer={handleDragEnterContainer}
          onDragEnd={handleDragEnd}
        />
      </div>
    ),
    'scratchpad': (
      <div 
        key="scratchpad"
        className={`${draggedListId === 'scratchpad' ? 'opacity-50' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart(e, 'scratchpad')}
        onDragEnter={(e) => {
          e.preventDefault();
          const componentIndex = state.lists.length + state.componentOrder.indexOf('scratchpad');
          handleDragEnterContainer(e, componentIndex);
        }}
        onDragEnd={handleDragEnd}
      >
        <BlueprintScratchpad
          rundownId={rundownData?.id || ''}
          rundownTitle={rundownData?.title || 'Unknown Rundown'}
        />
      </div>
    )
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <DashboardHeader 
        userEmail={user?.email} 
        onSignOut={handleSignOut} 
        showBackButton={true}
        onBack={handleBack}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BlueprintHeader
          rundown={rundownData}
          showDate={state.showDate}
          availableColumns={availableColumns}
          onShowDateUpdate={updateShowDate}
          onAddList={addNewList}
          onRefreshAll={refreshAllLists}
        />

        <div 
          data-drop-container
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {state.lists.length === 0 ? (
            <BlueprintEmptyState
              availableColumns={availableColumns}
              onAddList={addNewList}
            />
          ) : (
            <BlueprintListsGrid
              lists={state.lists}
              rundownItems={rundownData?.items || []}
              draggedListId={draggedListId}
              insertionIndex={insertionIndex}
              onDeleteList={deleteList}
              onRenameList={renameList}
              onUpdateCheckedItems={updateCheckedItems}
              onToggleUnique={toggleUniqueItems}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnterContainer={handleDragEnterContainer}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          )}

          {/* Render components in the specified order with insertion lines */}
          {state.componentOrder.map((componentId, index) => {
            const componentIndex = state.lists.length + index;
            return (
              <React.Fragment key={componentId}>
                {/* Insertion line before component */}
                {insertionIndex === componentIndex && (
                  <div className="h-1 bg-gray-400 rounded-full mb-4 animate-pulse w-full" />
                )}
                {componentMap[componentId as keyof typeof componentMap]}
              </React.Fragment>
            );
          })}

          {/* Final insertion line */}
          {insertionIndex === state.lists.length + state.componentOrder.length && (
            <div className="h-1 bg-gray-400 rounded-full mb-4 animate-pulse w-full" />
          )}
        </div>
      </div>
    </div>
  );
};

interface BlueprintProps {
  isDemoMode?: boolean;
}

const Blueprint = ({ isDemoMode = false }: BlueprintProps) => {
  const { id } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // State to track demo loading and data
  const [demoLoaded, setDemoLoaded] = React.useState(false);
  const [demoData, setDemoData] = React.useState<any>(null);

  // Create demo rundown data when in demo mode - load actual demo data
  const demoRundown = React.useMemo(() => {
    if (!isDemoMode) return null;
    if (demoData) return demoData;
    return {
      id: 'demo',
      title: 'Demo Rundown',
      items: [], // Will be loaded from database
      start_time: '09:00:00',
      timezone: 'America/New_York'
    };
  }, [isDemoMode, demoData]);

  // Load demo rundown data from database when in demo mode
  React.useEffect(() => {
    const loadDemoData = async () => {
      if (!isDemoMode || demoLoaded) return;
      
      try {
        const { data, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', 'e0d80b9d-5cf9-419d-bdb9-ae05e6e33dc8')
          .single();

        if (error) {
          console.error('Error loading demo rundown:', error);
          // Fallback to default data
          setDemoData({
            id: 'demo',
            title: 'Demo Rundown',
            items: createDefaultRundownItems(),
            start_time: '09:00:00',
            timezone: 'America/New_York'
          });
        } else if (data) {
          // Set the demo rundown with actual data
          setDemoData({
            id: 'demo',
            title: data.title || 'Demo Rundown',
            items: Array.isArray(data.items) && data.items.length > 0 
              ? data.items 
              : createDefaultRundownItems(),
            start_time: data.start_time || '09:00:00',
            timezone: data.timezone || 'America/New_York'
          });
        }
        setDemoLoaded(true);
      } catch (error) {
        console.error('Failed to load demo rundown:', error);
        // Fallback to default data
        setDemoData({
          id: 'demo',
          title: 'Demo Rundown',
          items: createDefaultRundownItems(),
          start_time: '09:00:00',
          timezone: 'America/New_York'
        });
        setDemoLoaded(true);
      }
    };

    loadDemoData();
  }, [isDemoMode, demoLoaded]);
  
  // Find the rundown - use demo data in demo mode, otherwise search saved rundowns
  const rundown = React.useMemo(() => {
    if (isDemoMode) return demoRundown;
    if (loading || !savedRundowns.length) return null;
    return savedRundowns.find(r => r.id === id) || undefined;
  }, [isDemoMode, demoRundown, savedRundowns, id, loading, demoLoaded]); // Add demoLoaded dependency

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      navigate('/login')
    }
  }

  const handleBack = () => {
    if (isDemoMode) {
      navigate('/demo');
    } else {
      navigate('/dashboard');
    }
  };

  // Show loading state while fetching rundowns (skip for demo mode)
  if (!isDemoMode && loading) {
    return <BlueprintLoadingSkeleton />;
  }

  // Show error state if rundown not found after loading is complete (skip for demo mode)
  if (!isDemoMode && !loading && rundown === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <DashboardHeader 
          userEmail={user?.email} 
          onSignOut={handleSignOut} 
          showBackButton={true}
          onBack={handleBack}
        />
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)' }}>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Rundown Not Found</h1>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading skeleton if rundown data is still null (skip for demo mode since we have demo data)
  if (!isDemoMode && !rundown) {
    return <BlueprintLoadingSkeleton />;
  }

  // Show loading skeleton for demo mode while loading demo data
  if (isDemoMode && !demoLoaded) {
    return <BlueprintLoadingSkeleton />;
  }

  // Only wrap in provider when we have a valid rundown - now passing rundown items
  return (
    <BlueprintProvider 
      rundownId={isDemoMode ? 'demo' : (id || '')} 
      rundownTitle={rundown?.title || 'Unknown Rundown'}
      rundownItems={rundown?.items || []}
      isDemoMode={isDemoMode}
    >
      <BlueprintContent />
    </BlueprintProvider>
  );
};

export default Blueprint;
