
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useBlueprintState } from '@/hooks/useBlueprintState';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import DashboardHeader from '@/components/DashboardHeader';
import BlueprintHeader from '@/components/blueprint/BlueprintHeader';
import BlueprintEmptyState from '@/components/blueprint/BlueprintEmptyState';
import BlueprintUnifiedGrid from '@/components/blueprint/BlueprintUnifiedGrid';
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
          <BlueprintUnifiedGrid
            lists={lists}
            rundownItems={rundown?.items || []}
            rundownId={id || ''}
            rundownTitle={rundown?.title || 'Unknown Rundown'}
            savedBlueprint={savedBlueprint}
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
      </div>
    </div>
  );
};

export default Blueprint;
