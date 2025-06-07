
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
      console.error('Blueprint: Sign out error, but still navigating to login:', error)
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

          {/* Insertion line for crew list */}
          {insertionIndex === lists.length + 1 && (
            <div className="h-1 bg-blue-500 rounded-full mb-4 animate-pulse" />
          )}

          <div 
            className={`${draggedListId === 'crew-list' ? 'opacity-50' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, 'crew-list')}
            onDragEnter={(e) => {
              e.preventDefault();
              handleDragEnterContainer(e, lists.length + 1);
            }}
            onDragEnd={handleDragEnd}
          >
            <CrewList 
              rundownId={id || ''}
              rundownTitle={rundown?.title || 'Unknown Rundown'}
              isDragging={draggedListId === 'crew-list'}
              onDragStart={handleDragStart}
              onDragEnterContainer={(e, index) => handleDragEnterContainer(e, lists.length + 1)}
              onDragEnd={handleDragEnd}
            />
          </div>

          {/* Insertion line for camera plot */}
          {insertionIndex === lists.length + 2 && (
            <div className="h-1 bg-blue-500 rounded-full mb-4 animate-pulse" />
          )}

          <div 
            className={`${draggedListId === 'camera-plot' ? 'opacity-50' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, 'camera-plot')}
            onDragEnter={(e) => {
              e.preventDefault();
              handleDragEnterContainer(e, lists.length + 2);
            }}
            onDragEnd={handleDragEnd}
          >
            <CameraPlot
              rundownId={id || ''}
              rundownTitle={rundown?.title || 'Unknown Rundown'}
              isDragging={draggedListId === 'camera-plot'}
              onDragStart={handleDragStart}
              onDragEnterContainer={(e, index) => handleDragEnterContainer(e, lists.length + 2)}
              onDragEnd={handleDragEnd}
            />
          </div>

          {/* Insertion line for scratchpad */}
          {insertionIndex === lists.length + 3 && (
            <div className="h-1 bg-blue-500 rounded-full mb-4 animate-pulse" />
          )}

          <div 
            className={`${draggedListId === 'scratchpad' ? 'opacity-50' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, 'scratchpad')}
            onDragEnter={(e) => {
              e.preventDefault();
              handleDragEnterContainer(e, lists.length + 3);
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
        </div>
      </div>
    </div>
  );
};

export default Blueprint;
