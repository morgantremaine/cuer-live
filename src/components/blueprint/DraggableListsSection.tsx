import React from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import BlueprintListsGrid from './BlueprintListsGrid';
import BlueprintEmptyState from './BlueprintEmptyState';
import AddListDialog from './AddListDialog';

interface DraggableListsSectionProps {
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
  // Section-level drag props
  isDragging?: boolean;
  onSectionDragStart?: (e: React.DragEvent, componentId: string) => void;
  onSectionDragEnter?: (e: React.DragEvent, index: number) => void;
  onSectionDragEnd?: () => void;
}

const DraggableListsSection: React.FC<DraggableListsSectionProps> = ({
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
  onDragEnd,
  isDragging,
  onSectionDragStart,
  onSectionDragEnter,
  onSectionDragEnd
}) => {
  return (
    <div 
      className={`${isDragging ? 'opacity-50' : ''}`}
      draggable
      onDragStart={(e) => onSectionDragStart?.(e, 'lists-section')}
      onDragEnter={(e) => {
        e.preventDefault();
        // Calculate the index for lists section in the component order
        const componentIndex = lists.length + 1; // AI summary + lists section
        onSectionDragEnter?.(e, componentIndex);
      }}
      onDragEnd={onSectionDragEnd}
    >
      <div className="space-y-6">
        {/* Always visible buttons */}
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

        {lists.length === 0 ? (
          <BlueprintEmptyState
            availableColumns={availableColumns}
            onAddList={onAddList}
          />
        ) : (
          <BlueprintListsGrid
            lists={lists}
            rundownItems={rundownItems}
            draggedListId={draggedListId}
            insertionIndex={insertionIndex}
            onDeleteList={onDeleteList}
            onRenameList={onRenameList}
            onUpdateCheckedItems={onUpdateCheckedItems}
            onToggleUnique={onToggleUnique}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnterContainer={onDragEnterContainer}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
          />
        )}
      </div>
    </div>
  );
};

export default DraggableListsSection;