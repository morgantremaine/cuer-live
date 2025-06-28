
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
import CrewList from '@/components/blueprint/CrewList';
import CameraPlot from '@/components/blueprint/CameraPlot';
import { BlueprintProvider, useBlueprintContext } from '@/contexts/BlueprintContext';
import { getAvailableColumns, generateListFromColumn } from '@/utils/blueprintUtils';

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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { savedRundowns, loading } = useRundownStorage();
  
  // Find the rundown - but only search if we have data loaded
  const rundown = React.useMemo(() => {
    if (loading || !savedRundowns.length) return null;
    return savedRundowns.find(r => r.id === id) || undefined;
  }, [savedRundowns, id, loading]);
  
  // Use BlueprintContext directly - single source of truth
  const {
    state,
    updateLists,
    addList,
    deleteList,
    renameList,
    updateCheckedItems,
    updateShowDate,
    updateComponentOrder
  } = useBlueprintContext();

  // Get available columns from rundown items
  const availableColumns = React.useMemo(() => {
    if (!rundown?.items) return [];
    return getAvailableColumns(rundown.items);
  }, [rundown?.items]);

  // Add new list
  const addNewList = React.useCallback((name: string, sourceColumn: string) => {
    console.log('📋 Adding new list:', name, 'from column:', sourceColumn);
    
    if (!rundown?.items) return;
    
    const newList = {
      id: `${sourceColumn}_${Date.now()}`,
      name,
      sourceColumn,
      items: generateListFromColumn(rundown.items, sourceColumn),
      checkedItems: {}
    };
    
    console.log('📋 Generated new list:', newList);
    addList(newList);
  }, [rundown?.items, addList]);

  // Refresh all lists
  const refreshAllLists = React.useCallback(() => {
    console.log('📋 Refreshing all lists with current rundown data');
    if (!rundown?.items) return;
    
    const refreshedLists = state.lists.map(list => ({
      ...list,
      items: generateListFromColumn(rundown.items, list.sourceColumn)
    }));
    updateLists(refreshedLists);
  }, [rundown?.items, state.lists, updateLists]);

  // Toggle unique items display
  const toggleUniqueItems = React.useCallback((listId: string, showUnique: boolean) => {
    console.log('📋 BlueprintContent: toggleUniqueItems called for list', listId, 'showUnique:', showUnique);
    
    const updatedLists = state.lists.map(list => 
      list.id === listId ? { ...list, showUniqueOnly: showUnique } : list
    );
    
    console.log('📋 BlueprintContent: updating lists with showUniqueOnly toggle');
    updateLists(updatedLists);
  }, [state.lists, updateLists]);

  // Drag and drop state for lists and components
  const [draggedListId, setDraggedListId] = React.useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = React.useState<number | null>(null);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    console.log('📋 Drag start:', itemId);
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
      console.log('📋 Drag enter container at index:', index, 'for item:', draggedListId);
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
    console.log('📋 Drop event:', { draggedId, insertionIndex });
    
    if (!draggedId || insertionIndex === null) {
      setDraggedListId(null);
      setInsertionIndex(null);
      return;
    }

    // Handle special components reordering
    if (draggedId === 'crew-list' || draggedId === 'camera-plot' || draggedId === 'scratchpad') {
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
        console.log('📋 Updating component order:', currentComponentOrder);
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
    
    console.log('📋 Reordered lists:', newLists.map(l => l.name));
    updateLists(newLists);

    setDraggedListId(null);
    setInsertionIndex(null);
  };

  const handleDragEnd = () => {
    console.log('📋 Drag end');
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
    navigate('/dashboard');
  };

  // Show loading skeleton while data is being loaded
  if (loading) {
    return <BlueprintLoadingSkeleton />;
  }

  // If data has loaded but rundown is not found, show error
  if (!loading && rundown === undefined) {
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

  // Show loading skeleton if rundown data is still null (being loaded)
  if (!rundown) {
    return <BlueprintLoadingSkeleton />;
  }

  // Create component mapping for rendering in the correct order
  const componentMap = {
    'crew-list': (
      <div 
        key="crew-list"
        className={`${draggedListId === 'crew-list' ? 'opacity-50' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart(e, 'crew-list')}
        onDragEnter={(e) => {
          e.preventDefault();
          const componentIndex = state.lists.length + state.componentOrder.indexOf('crew-list');
          handleDragEnterContainer(e, componentIndex);
        }}
        onDragEnd={handleDragEnd}
      >
        <CrewList 
          rundownId={id || ''}
          rundownTitle={rundown?.title || 'Unknown Rundown'}
          isDragging={draggedListId === 'crew-list'}
          onDragStart={handleDragStart}
          onDragEnterContainer={handleDragEnterContainer}
          onDragEnd={handleDragEnd}
        />
      </div>
    ),
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
          rundownId={id || ''}
          rundownTitle={rundown?.title || 'Unknown Rundown'}
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
          rundownId={id || ''}
          rundownTitle={rundown?.title || 'Unknown Rundown'}
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
          rundown={rundown}
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
              rundownItems={rundown?.items || []}
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

const Blueprint = () => {
  const { id } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Find the rundown - but only search if we have data loaded
  const rundown = React.useMemo(() => {
    if (loading || !savedRundowns.length) return null;
    return savedRundowns.find(r => r.id === id) || undefined;
  }, [savedRundowns, id, loading]);

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      navigate('/login')
    }
  }

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Show loading state while fetching rundowns
  if (loading) {
    return <BlueprintLoadingSkeleton />;
  }

  // Show error state if rundown not found after loading is complete
  if (!loading && rundown === undefined) {
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

  // Show loading skeleton if rundown data is still null (being loaded)
  if (!rundown) {
    return <BlueprintLoadingSkeleton />;
  }

  // Only wrap in provider when we have a valid rundown
  return (
    <BlueprintProvider 
      rundownId={id || ''} 
      rundownTitle={rundown.title || 'Unknown Rundown'}
    >
      <BlueprintContent />
    </BlueprintProvider>
  );
};

export default Blueprint;
