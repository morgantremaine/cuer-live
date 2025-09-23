
import React from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import BlueprintListCard from './BlueprintListCard';
import AddListDialog from './AddListDialog';

interface BlueprintListsGridProps {
  lists: BlueprintList[];
  rundownItems: RundownItem[];
  availableColumns: { name: string; value: string }[];
  draggedListId: string | null;
  insertionIndex: number | null;
  onDeleteList: (listId: string) => void;
  onRenameList: (listId: string, newName: string) => void;
  onUpdateCheckedItems: (listId: string, checkedItems: Record<string, boolean>) => void;
  onToggleUnique?: (listId: string, showUnique: boolean) => void;
  onAddList: (name: string, sourceColumn: string) => void;
  onRefreshAll: () => void;
  onDragStart: (e: React.DragEvent, listId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnterContainer: (e: React.DragEvent, index: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

const BlueprintListsGrid = ({
  lists,
  rundownItems,
  availableColumns,
  draggedListId,
  insertionIndex,
  onDeleteList,
  onRenameList,
  onUpdateCheckedItems,
  onToggleUnique,
  onAddList,
  onRefreshAll,
  onDragStart,
  onDragOver,
  onDragEnterContainer,
  onDragLeave,
  onDrop,
  onDragEnd
}: BlueprintListsGridProps) => {
  return (
    <div className="space-y-6">
      {/* Header with buttons */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <AddListDialog
          availableColumns={availableColumns}
          onAddList={onAddList}
        />
        <Button
          variant="outline"
          onClick={onRefreshAll}
          className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 hover:border-gray-500"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      <div 
        className="columns-1 lg:columns-2 gap-6 relative"
        data-drop-container
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
      {lists.map((list, index) => (
        <React.Fragment key={list.id}>
          {/* Insertion line at the top */}
          {insertionIndex === index && (
            <div className="h-1 bg-gray-400 rounded-full mb-4 break-inside-avoid animate-pulse" />
          )}
          
          <div className="break-inside-avoid mb-6">
            <BlueprintListCard
              list={list}
              index={index}
              rundownItems={rundownItems}
              onDelete={onDeleteList}
              onRename={onRenameList}
              onUpdateCheckedItems={onUpdateCheckedItems}
              onToggleUnique={onToggleUnique}
              isDragging={draggedListId === list.id}
              onDragStart={onDragStart}
              onDragEnterContainer={onDragEnterContainer}
              onDragEnd={onDragEnd}
            />
          </div>
        </React.Fragment>
      ))}
      
        {/* Final insertion line */}
        {insertionIndex === lists.length && (
          <div className="h-1 bg-gray-400 rounded-full mt-4 break-inside-avoid animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default BlueprintListsGrid;
