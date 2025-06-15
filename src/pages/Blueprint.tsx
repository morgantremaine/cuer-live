
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import DashboardHeader from '@/components/DashboardHeader';
import BlueprintHeader from '@/components/blueprint/BlueprintHeader';
import BlueprintEmptyState from '@/components/blueprint/BlueprintEmptyState';
import BlueprintListsGrid from '@/components/blueprint/BlueprintListsGrid';
import BlueprintScratchpad from '@/components/blueprint/BlueprintScratchpad';
import CrewList from '@/components/blueprint/CrewList';
import CameraPlot from '@/components/blueprint/CameraPlot';
import { BlueprintProvider, useBlueprintContext } from '@/contexts/BlueprintContext';

const BlueprintContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { savedRundowns, loading } = useRundownStorage();
  
  const rundown = savedRundowns.find(r => r.id === id);
  
  // Use the unified context system
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

  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);

  // Simple drag handlers for lists and components
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    console.log('📋 Drag start:', itemId);
    setDraggedListId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnterContainer = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedListId) {
      console.log('📋 Drag enter container at index:', index, 'for item:', draggedListId);
      
      // For component items (crew-list, camera-plot, scratchpad)
      if (draggedListId === 'crew-list' || draggedListId === 'camera-plot' || draggedListId === 'scratchpad') {
        setInsertionIndex(index);
        return;
      }

      // For list items
      const draggedIndex = state.lists.findIndex(list => list.id === draggedListId);
      
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseY = e.clientY;
      const elementCenter = rect.top + rect.height / 2;
      
      let targetIndex = index;
      if (mouseY > elementCenter) {
        targetIndex = index + 1;
      }
      
      if (draggedIndex !== -1 && draggedIndex < targetIndex) {
        targetIndex -= 1;
      }
      
      console.log('📋 List drag - target index:', targetIndex);
      setInsertionIndex(targetIndex);
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
        
        // Update the component order in the unified state
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

  // Add new list using context
  const handleAddNewList = (name: string, sourceColumn: string) => {
    const newList = {
      id: `${sourceColumn}_${Date.now()}`,
      name,
      sourceColumn,
      items: [], // Will be populated by the context
      checkedItems: {}
    };
    addList(newList);
  };

  // Get available columns from rundown items
  const getAvailableColumns = () => {
    if (!rundown?.items || rundown.items.length === 0) return [];
    
    const columns = [];
    
    // Check for headers
    const hasHeaders = rundown.items.some(item => item.type === 'header' || item.isHeader);
    if (hasHeaders) {
      columns.push({ name: 'Headers', value: 'headers' });
    }
    
    // Check for other standard fields
    const standardFields = ['talent', 'gfx', 'video', 'notes', 'script'];
    standardFields.forEach(field => {
      const hasField = rundown.items.some(item => item[field] && item[field].trim() !== '');
      if (hasField) {
        columns.push({ 
          name: field.charAt(0).toUpperCase() + field.slice(1), 
          value: field 
        });
      }
    });
    
    return columns;
  };

  if (loading || state.isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!rundown) {
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

  if (state.error) {
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
            <h1 className="text-2xl font-bold text-red-400 mb-4">Error Loading Blueprint</h1>
            <p className="text-gray-400 mb-4">{state.error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const availableColumns = getAvailableColumns();

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
          onAddList={handleAddNewList}
          onRefreshAll={() => {
            // Refresh functionality - reload lists from rundown data
            window.location.reload();
          }}
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
              onAddList={handleAddNewList}
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
  
  const rundown = savedRundowns.find(r => r.id === id);

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
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error state if rundown not found - but don't wrap in provider
  if (!rundown) {
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
