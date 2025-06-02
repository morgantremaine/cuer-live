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

const Blueprint = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { savedRundowns, loading, updateRundown, loadRundowns } = useRundownStorage();
  
  const rundown = savedRundowns.find(r => r.id === id);
  const [localIcon, setLocalIcon] = useState<string | undefined>();
  
  // Update local icon when rundown changes or loads
  useEffect(() => {
    if (rundown?.icon !== undefined) {
      console.log('Blueprint: Setting local icon from rundown:', rundown.icon ? 'Icon present' : 'No icon');
      setLocalIcon(rundown.icon);
    }
  }, [rundown?.icon]);

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

  const handleIconChange = async (iconData: string | null) => {
    if (!rundown || !id) {
      console.error('Blueprint: Cannot update icon - no rundown or id');
      return;
    }

    try {
      console.log('Blueprint: Updating icon:', iconData ? 'Setting new icon' : 'Removing icon');
      
      // Update local state immediately for responsive UI
      setLocalIcon(iconData || undefined);
      
      // Update in database with explicit icon parameter
      await updateRundown(
        id,
        rundown.title,
        rundown.items,
        true, // silent update
        false, // not archived
        rundown.columns,
        rundown.timezone,
        rundown.startTime || rundown.start_time,
        iconData || undefined
      );
      
      console.log('Blueprint: Icon update completed successfully');
      
      // Reload rundowns to get fresh data from database
      await loadRundowns();
      
    } catch (error) {
      console.error('Blueprint: Error updating icon:', error);
      // Revert local state if update fails
      setLocalIcon(rundown.icon);
    }
  };

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
          rundown={{
            ...rundown,
            icon: localIcon // Use local icon state
          }}
          showDate={showDate}
          availableColumns={availableColumns}
          onShowDateUpdate={updateShowDate}
          onIconChange={handleIconChange}
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
      </div>
    </div>
  );
};

export default Blueprint;
