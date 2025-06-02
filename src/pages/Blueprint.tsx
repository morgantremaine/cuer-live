
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useBlueprintState } from '@/hooks/useBlueprintState';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import BlueprintHeader from '@/components/blueprint/BlueprintHeader';
import BlueprintEmptyState from '@/components/blueprint/BlueprintEmptyState';
import BlueprintListsGrid from '@/components/blueprint/BlueprintListsGrid';

const Blueprint = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { savedRundowns, loading, updateRundown } = useRundownStorage();
  
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
    if (!rundown || !id) return;

    try {
      await updateRundown(
        id,
        rundown.title,
        rundown.items,
        true, // silent update
        false, // not archived
        rundown.columns,
        rundown.timezone,
        rundown.startTime,
        iconData
      );
    } catch (error) {
      console.error('Error updating icon:', error);
    }
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Rundown Not Found</h1>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BlueprintHeader
          rundown={rundown}
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
