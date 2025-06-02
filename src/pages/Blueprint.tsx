
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useBlueprintState } from '@/hooks/useBlueprintState';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import BlueprintHeader from '@/components/blueprint/BlueprintHeader';
import BlueprintEmptyState from '@/components/blueprint/BlueprintEmptyState';
import BlueprintListsGrid from '@/components/blueprint/BlueprintListsGrid';
import BlueprintScratchpad from '@/components/blueprint/BlueprintScratchpad';
import { useBlueprintStorage } from '@/hooks/useBlueprintStorage';

const Blueprint = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { savedRundowns, loading, updateRundown, loadRundowns } = useRundownStorage();
  
  const rundown = savedRundowns.find(r => r.id === id);

  // Load rundowns when component mounts to ensure fresh data
  useEffect(() => {
    if (!loading && id) {
      loadRundowns();
    }
  }, [id]);
  
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
    handleDragEnd
  } = useBlueprintState(
    id || '',
    rundown?.title || 'Unknown Rundown',
    rundown?.items || [],
    rundown?.startTime
  );

  const { savedBlueprint } = useBlueprintStorage(id || '');

  const handleSignOut = async () => {
    try {
      console.log('Blueprint: Starting sign out process')
      await signOut()
      console.log('Blueprint: Sign out completed, navigating to login')
      navigate('/login')
    } catch (error) {
      console.error('Blueprint: Sign out error, but still navigating to login:', error)
      navigate('/login')
    }
  }

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
        <DashboardHeader userEmail={user?.email} onSignOut={handleSignOut} />
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
      <DashboardHeader userEmail={user?.email} onSignOut={handleSignOut} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 hover:border-gray-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>

        <BlueprintHeader
          rundown={rundown}
          showDate={showDate}
          availableColumns={availableColumns}
          onShowDateUpdate={updateShowDate}
          onAddList={addNewList}
          onRefreshAll={refreshAllLists}
        />

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
  );
};

export default Blueprint;
