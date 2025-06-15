
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
import { BlueprintProvider } from '@/contexts/BlueprintContext';
import { useUnifiedBlueprintState } from '@/hooks/blueprint/useUnifiedBlueprintState';

const BlueprintContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { savedRundowns, loading } = useRundownStorage();
  
  const rundown = savedRundowns.find(r => r.id === id);
  
  const {
    lists,
    availableColumns,
    showDate,
    updateShowDate,
    addNewList,
    deleteList,
    renameList,
    updateCheckedItems,
    refreshAllLists,
    draggedListId,
    insertionIndex,
    componentOrder,
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    updateComponentOrder,
    initialized,
    loading: blueprintLoading,
    error
  } = useUnifiedBlueprintState(
    rundown?.items || [],
    rundown?.start_time
  );

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

  if (loading || blueprintLoading) {
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

  if (error) {
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
            <p className="text-gray-400 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Create component mapping for rendering in the correct order
  const componentMap = {
    'crew-list': (
      <div 
        key="crew-list"
        className={`${draggedListId === 'crew-list' ? 'opacity-50' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart()}
        onDragEnter={(e) => {
          e.preventDefault();
          handleDragEnterContainer();
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
        onDragStart={(e) => handleDragStart()}
        onDragEnter={(e) => {
          e.preventDefault();
          handleDragEnterContainer();
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
        onDragStart={(e) => handleDragStart()}
        onDragEnter={(e) => {
          e.preventDefault();
          handleDragEnterContainer();
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
          showDate={showDate}
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
          {lists.length === 0 ? (
            <BlueprintEmptyState
              availableColumns={availableColumns}
              onAddList={addNewList}
            />
          ) : (
            <BlueprintListsGrid
              lists={lists}
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
          {componentOrder.map((componentId, index) => (
            <React.Fragment key={componentId}>
              {/* Insertion line before component */}
              {insertionIndex === lists.length + 1 + index && (
                <div className="h-1 bg-blue-500 rounded-full mb-4 animate-pulse" />
              )}
              {componentMap[componentId as keyof typeof componentMap]}
            </React.Fragment>
          ))}

          {/* Final insertion line */}
          {insertionIndex === lists.length + 1 + componentOrder.length && (
            <div className="h-1 bg-blue-500 rounded-full mb-4 animate-pulse" />
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
