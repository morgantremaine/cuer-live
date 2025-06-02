
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useBlueprintState } from '@/hooks/useBlueprintState';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, FileText } from 'lucide-react';
import BlueprintListCard from '@/components/blueprint/BlueprintListCard';
import AddListDialog from '@/components/blueprint/AddListDialog';

const Blueprint = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { savedRundowns, loading } = useRundownStorage();
  
  const rundown = savedRundowns.find(r => r.id === id);
  
  const {
    lists,
    availableColumns,
    addNewList,
    deleteList,
    renameList,
    refreshAllLists,
    draggedListId,
    dropTargetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  } = useBlueprintState(
    id || '',
    rundown?.title || 'Unknown Rundown',
    rundown?.items || []
  );

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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 hover:border-gray-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/rundown/${id}`)}
                className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 hover:border-gray-500"
              >
                <FileText className="h-4 w-4 mr-2" />
                Back to Rundown
              </Button>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Blueprint</h1>
              <p className="text-gray-400">{rundown.title}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={refreshAllLists}
              className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 hover:border-gray-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </Button>
            <AddListDialog
              availableColumns={availableColumns}
              onAddList={addNewList}
            />
          </div>
        </div>

        {/* Lists in Column Layout */}
        {lists.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-white mb-2">No Lists Created</h3>
            <p className="text-gray-400 mb-4">Create your first asset list to get started</p>
            <AddListDialog
              availableColumns={availableColumns}
              onAddList={addNewList}
            />
          </div>
        ) : (
          <div className="columns-2 gap-6">
            {lists.map((list, index) => (
              <div key={list.id} className="break-inside-avoid mb-6">
                <BlueprintListCard
                  list={list}
                  onDelete={deleteList}
                  onRename={renameList}
                  isDragging={draggedListId === list.id}
                  isDropTarget={dropTargetIndex === index}
                  onDragStart={handleDragStart}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blueprint;
