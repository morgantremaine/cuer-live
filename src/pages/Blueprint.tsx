
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useBlueprintState } from '@/hooks/useBlueprintState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, RefreshCw, FileText, Clock, Calendar } from 'lucide-react';
import BlueprintListCard from '@/components/blueprint/BlueprintListCard';
import AddListDialog from '@/components/blueprint/AddListDialog';
import IconUpload from '@/components/blueprint/IconUpload';

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
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              {rundown.icon && (
                <img 
                  src={rundown.icon} 
                  alt="Rundown icon" 
                  className="w-16 h-16 rounded object-cover"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-white">Blueprint</h1>
                <p className="text-gray-400">{rundown.title}</p>
              </div>
            </div>
            
            {/* Start Time and Date Section */}
            <div className="flex items-center space-x-6 mb-4">
              {rundown.startTime && (
                <div className="flex items-center space-x-2 text-gray-300">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Start Time: {rundown.startTime}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-300" />
                <label htmlFor="show-date" className="text-sm text-gray-300">Show Date:</label>
                <Input
                  id="show-date"
                  type="date"
                  value={showDate}
                  onChange={(e) => updateShowDate(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white w-40 h-8 text-sm"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
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
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            <IconUpload
              currentIcon={rundown.icon}
              onIconChange={handleIconChange}
            />
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
          <div 
            className="columns-2 gap-6 relative"
            data-drop-container
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {lists.map((list, index) => (
              <React.Fragment key={list.id}>
                {/* Insertion line at the top */}
                {insertionIndex === index && (
                  <div className="h-1 bg-blue-500 rounded-full mb-4 break-inside-avoid animate-pulse" />
                )}
                
                <div className="break-inside-avoid mb-6">
                  <BlueprintListCard
                    list={list}
                    index={index}
                    onDelete={deleteList}
                    onRename={renameList}
                    isDragging={draggedListId === list.id}
                    onDragStart={handleDragStart}
                    onDragEnterContainer={handleDragEnterContainer}
                    onDragEnd={handleDragEnd}
                  />
                </div>
                
                {/* Insertion line at the bottom if it's the last item */}
                {insertionIndex === lists.length && index === lists.length - 1 && (
                  <div className="h-1 bg-blue-500 rounded-full mt-4 break-inside-avoid animate-pulse" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blueprint;
