
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useBlueprintState } from '@/hooks/useBlueprintState';
import { useAuth } from '@/hooks/useAuth';
import { useTeammateChangeNotification } from '@/hooks/useTeammateChangeNotification';
import { Button } from '@/components/ui/button';
import DashboardHeader from '@/components/DashboardHeader';
import BlueprintHeader from '@/components/blueprint/BlueprintHeader';
import BlueprintEmptyState from '@/components/blueprint/BlueprintEmptyState';
import BlueprintListsGrid from '@/components/blueprint/BlueprintListsGrid';
import BlueprintScratchpad from '@/components/blueprint/BlueprintScratchpad';
import CrewList from '@/components/blueprint/CrewList';
import CameraPlot from '@/components/blueprint/CameraPlot';

const Blueprint = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { savedRundowns, loading } = useRundownStorage();
  
  const rundown = savedRundowns.find(r => r.id === id);
  
  // Set up teammate change notifications for blueprints
  useTeammateChangeNotification({
    rundownId: id || null,
    enabled: !!id
  });
  
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
    savedBlueprint
  } = useBlueprintState(
    id || '',
    rundown?.title || 'Unknown Rundown',
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

  if (loading) {
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
          handleDragEnterContainer(e, lists.length + 1 + componentOrder.indexOf('crew-list'));
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
          handleDragEnterContainer(e, lists.length + 1 + componentOrder.indexOf('camera-plot'));
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
          handleDragEnterContainer(e, lists.length + 1 + componentOrder.indexOf('scratchpad'));
        }}
        onDragEnd={handleDragEnd}
      >
        <BlueprintScratchpad
          rundownId={id || ''}
          rundownTitle={rundown?.title || 'Unknown Rundown'}
          initialNotes={savedBlueprint?.notes || ''}
          onNotesChange={(notes) => {
            // Notes are automatically handled by the component
          }}
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

export default Blueprint;
