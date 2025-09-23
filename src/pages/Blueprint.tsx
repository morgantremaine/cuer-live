import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useAuth } from '@/hooks/useAuth';
import { useTeamCustomColumns } from '@/hooks/useTeamCustomColumns';
import { Button } from '@/components/ui/button';
import DraggableListsSection from '@/components/blueprint/DraggableListsSection';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardHeader from '@/components/DashboardHeader';
import BlueprintHeader from '@/components/blueprint/BlueprintHeader';
import BlueprintScratchpad from '@/components/blueprint/BlueprintScratchpad';
import CameraPlot from '@/components/blueprint/CameraPlot';
import RundownSummary from '@/components/blueprint/RundownSummary';
import { BlueprintProvider, useBlueprintContext } from '@/contexts/BlueprintContext';
import { getAvailableColumns, generateListFromColumn } from '@/utils/blueprintUtils';
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { savedRundowns, loading } = useRundownStorage();
  const { teamColumns } = useTeamCustomColumns();
  
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
    updateComponentOrder,
    autoRefreshLists
  } = useBlueprintContext();

  // Get available columns from rundown items and custom columns
  const availableColumns = React.useMemo(() => {
    if (!rundown?.items) return [];
    
    // Convert team columns to the format expected by getAvailableColumns
    const customColumnsForBlueprint = teamColumns.map(tc => ({
      key: tc.column_key,
      name: tc.column_name
    }));
    
    return getAvailableColumns(rundown.items, customColumnsForBlueprint);
  }, [rundown?.items, teamColumns]);

  // Add new list
  const addNewList = React.useCallback((name: string, sourceColumn: string) => {
    logger.blueprint('Adding new list:', { name, sourceColumn });
    
    if (!rundown?.items) return;
    
    const newList = {
      id: `${sourceColumn}_${Date.now()}`,
      name,
      sourceColumn,
      items: generateListFromColumn(rundown.items, sourceColumn),
      checkedItems: {}
    };
    
    logger.blueprint('Generated new list:', newList);
    addList(newList);
  }, [rundown?.items, addList]);

  // Refresh all lists - now using the context's autoRefreshLists
  const refreshAllLists = React.useCallback(() => {
    logger.blueprint('Manual refresh all lists triggered');
    if (!rundown?.items) {
      logger.blueprint('No rundown items available for refresh');
      return;
    }
    
    autoRefreshLists(rundown.items);
  }, [rundown?.items, autoRefreshLists]);

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
  const [draggedComponentId, setDraggedComponentId] = React.useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = React.useState<number | null>(null);

  // Drag handlers for lists within the lists section
  const handleListDragStart = (e: React.DragEvent, itemId: string) => {
    logger.blueprint('List drag start:', itemId);
    setDraggedListId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };

  // Drag handlers for section-level components
  const handleSectionDragStart = (e: React.DragEvent, componentId: string) => {
    logger.blueprint('Section drag start:', componentId);
    setDraggedComponentId(componentId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', componentId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnterContainer = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedListId || draggedComponentId) {
      logger.blueprint('Drag enter container at index:', { index, draggedListId, draggedComponentId });
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
    logger.blueprint('Drop event:', { draggedId, insertionIndex, draggedListId, draggedComponentId });
    
    if (!draggedId || insertionIndex === null) {
      setDraggedListId(null);
      setDraggedComponentId(null);
      setInsertionIndex(null);
      return;
    }

    // Handle component-level reordering (AI summary, lists section, scratchpad)
    if (draggedComponentId) {
      const currentComponentOrder = [...state.componentOrder];
      const draggedIndex = currentComponentOrder.indexOf(draggedComponentId);
      
      if (draggedIndex !== -1) {
        // Remove from current position
        currentComponentOrder.splice(draggedIndex, 1);
        
        // Insert at new position
        currentComponentOrder.splice(insertionIndex, 0, draggedComponentId);
        
        // Update the component order
        logger.blueprint('Updating component order:', currentComponentOrder);
        updateComponentOrder(currentComponentOrder);
      }
      
      setDraggedComponentId(null);
      setInsertionIndex(null);
      return;
    }

    // Handle list reordering within lists section (existing logic)
    if (draggedListId) {
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
    }
  };

  const handleDragEnd = () => {
    logger.blueprint('Drag end');
    setDraggedListId(null);
    setDraggedComponentId(null);
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
    'ai-summary': (
      <RundownSummary 
        key="ai-summary"
        rundownItems={rundown?.items || []}
        rundownTitle={rundown?.title || 'Unknown Rundown'}
        isDragging={draggedComponentId === 'ai-summary'}
        onDragStart={handleSectionDragStart}
        onDragEnter={handleDragEnterContainer}
        onDragEnd={handleDragEnd}
      />
    ),
    'lists-section': (
      <DraggableListsSection
        key="lists-section"
        lists={state.lists}
        rundownItems={rundown?.items || []}
        availableColumns={availableColumns}
        draggedListId={draggedListId}
        insertionIndex={insertionIndex}
        onDeleteList={deleteList}
        onRenameList={renameList}
        onUpdateCheckedItems={updateCheckedItems}
        onToggleUnique={toggleUniqueItems}
        onAddList={addNewList}
        onRefreshAll={refreshAllLists}
        onDragStart={handleListDragStart}
        onDragOver={handleDragOver}
        onDragEnterContainer={handleDragEnterContainer}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        isDragging={draggedComponentId === 'lists-section'}
        onSectionDragStart={handleSectionDragStart}
        onSectionDragEnter={handleDragEnterContainer}
        onSectionDragEnd={handleDragEnd}
      />
    ),
    'scratchpad': (
      <div 
        key="scratchpad"
        className={`${draggedComponentId === 'scratchpad' ? 'opacity-50' : ''}`}
        draggable
        onDragStart={(e) => handleSectionDragStart(e, 'scratchpad')}
        onDragEnter={(e) => {
          e.preventDefault();
          const componentIndex = state.componentOrder.indexOf('scratchpad');
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
        />

        <div 
          data-drop-container
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Render components in the specified order with insertion lines */}
          {state.componentOrder.map((componentId, index) => (
            <React.Fragment key={componentId}>
              {/* Insertion line before component */}
              {insertionIndex === index && (
                <div className="h-1 bg-gray-400 rounded-full mb-4 animate-pulse w-full" />
              )}
              {componentMap[componentId as keyof typeof componentMap]}
            </React.Fragment>
          ))}

          {/* Final insertion line */}
          {insertionIndex === state.componentOrder.length && (
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

  // Only wrap in provider when we have a valid rundown - now passing rundown items
  return (
    <BlueprintProvider 
      rundownId={id || ''} 
      rundownTitle={rundown.title || 'Unknown Rundown'}
      rundownItems={rundown.items || []}
    >
      <BlueprintContent />
    </BlueprintProvider>
  );
};

export default Blueprint;
