import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useRealtimeRundown } from '@/hooks/useRealtimeRundown';
import { useRundownItems } from '@/hooks/useRundownItems';
import { useColumnsManager } from '@/hooks/useColumnsManager';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useDnd } from '@/hooks/useDnd';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useRundownSearch } from '@/hooks/useRundownSearch';
import { RundownItem } from '@/types/rundown';
import RundownHeaderPropsAdapter from './RundownHeaderPropsAdapter';
import RundownMainPropsAdapter from './RundownMainPropsAdapter';
import SearchDialog from './SearchDialog';

interface RundownGridProps {
  rundownId?: string;
  isShared?: boolean;
  canEdit?: boolean;
  realtime?: boolean;
}

const RundownGrid = ({
  rundownId,
  isShared = false,
  canEdit = true,
  realtime = true
}: RundownGridProps) => {
  const { id: routeRundownId } = useParams<{ id: string }>();
  const activeRundownId = rundownId || routeRundownId;

  const {
    connected,
    currentTime,
    timezone,
    onTimezoneChange,
  } = useRealtimeRundown(activeRundownId, realtime);

  const {
    items,
    currentSegmentId,
    handleUpdateItem,
    handleCreateItem,
    handleDeleteItem,
    handleInsertItem,
    handleDuplicateItem,
    handleFloatItem,
    handleJumpToHere
  } = useRundownItems(activeRundownId, realtime);

  const {
    columns,
    handleUpdateColumn,
    handleCreateColumn,
    handleDeleteColumn,
    handleMoveColumn
  } = useColumnsManager(activeRundownId, realtime);

  const {
    selectedRows,
    isRowSelected,
    isMultipleRowsSelected,
    handleRowSelect,
    clearSelection
  } = useKeyboardNavigation(items);

  const {
    draggedIndex,
    isDragging,
    isDraggingMultiple,
    handleDragStart,
    handleDragOver,
    handleDrop
  } = useDnd(activeRundownId, items, handleMoveItem);

  const {
    undo,
    redo,
    canUndo,
    canRedo,
    lastAction,
    setInitialState
  } = useUndoRedo();

  const {
    searchQuery,
    replaceQuery,
    isSearchOpen,
    currentMatchIndex,
    searchOptions,
    searchMatches,
    currentMatch,
    setSearchQuery,
    setReplaceQuery,
    setIsSearchOpen,
    setSearchOptions,
    goToNextMatch,
    goToPreviousMatch,
    replaceCurrentMatch,
    replaceAllMatches
  } = useRundownSearch(items, columns);

  const [showSearchDialog, setShowSearchDialog] = useState(false);

  const rundownStateRef = useRef({
    items,
    columns
  });

  useEffect(() => {
    rundownStateRef.current = {
      items,
      columns
    };
  }, [items, columns]);

  useEffect(() => {
    setInitialState({ items, columns });
  }, [items, columns, setInitialState]);

  const handleUndo = useCallback(async () => {
    const previousState = await undo();
    if (previousState) {
      const { items: previousItems, columns: previousColumns } = previousState;

      // Apply the previous state to the current state
      if (previousItems) {
        // Iterate through previousItems and update or create items in the current state
        for (const item of previousItems) {
          await handleUpdateItem(item.id, 'name', item.name);
          await handleUpdateItem(item.id, 'duration', item.duration);
          await handleUpdateItem(item.id, 'script', item.script);
          await handleUpdateItem(item.id, 'notes', item.notes);
          await handleUpdateItem(item.id, 'talent', item.talent);
          await handleUpdateItem(item.id, 'gfx', item.gfx);
          await handleUpdateItem(item.id, 'video', item.video);
          await handleUpdateItem(item.id, 'images', item.images);
          await handleUpdateItem(item.id, 'color', item.color);
          await handleUpdateItem(item.id, 'isFloating', item.isFloating);
          await handleUpdateItem(item.id, 'isFloated', item.isFloated);
          if (item.customFields) {
            for (const key in item.customFields) {
              await handleUpdateItem(item.id, `customFields.${key}`, item.customFields[key]);
            }
          }
        }

        // Delete items that are not in previousItems
        for (const item of items) {
          if (!previousItems.find((previousItem: RundownItem) => previousItem.id === item.id)) {
            await handleDeleteItem(item.id);
          }
        }
      }

      if (previousColumns) {
        // Iterate through previousColumns and update or create columns in the current state
        for (const column of previousColumns) {
          await handleUpdateColumn(column.id, 'title', column.title);
          await handleUpdateColumn(column.id, 'width', column.width);
          await handleUpdateColumn(column.id, 'key', column.key);
          await handleUpdateColumn(column.id, 'isCustom', column.isCustom);
        }

        // Delete columns that are not in previousColumns
        for (const column of columns) {
          if (!previousColumns.find((previousColumn: any) => previousColumn.id === column.id)) {
            await handleDeleteColumn(column.id);
          }
        }
      }
    }
  }, [undo, items, columns, handleUpdateItem, handleDeleteItem, handleUpdateColumn, handleDeleteColumn]);

  const handleRedo = useCallback(async () => {
    await redo();
  }, [redo]);

  function handleMoveItem(dragIndex: number, hoverIndex: number) {
    const dragItem = items[dragIndex];
    const newItems = [...items];
    newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, dragItem);

    // Update the state with the new order
    //setItems(newItems);
  }

  const handleCreateNewItem = async (type: 'header' | 'regular') => {
    await handleCreateItem(type);
  };

  const handleCopySelectedRows = () => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    navigator.clipboard.writeText(JSON.stringify(selectedItems));
  };

  const handleDeleteSelectedRows = async () => {
    for (const id of selectedRows) {
      await handleDeleteItem(id);
    }
    clearSelection();
  };

  const handlePasteRows = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const pastedItems = JSON.parse(text);

      if (Array.isArray(pastedItems)) {
        // Get the index of the first selected row, or 0 if no rows are selected
        const insertIndex = selectedRows.size > 0 ? items.findIndex(item => selectedRows.has(item.id)) : 0;

        // Insert the pasted items at the determined index
        for (let i = 0; i < pastedItems.length; i++) {
          const pastedItem = pastedItems[i];
          await handleInsertItem(pastedItem, insertIndex + i);
        }
      }
    } catch (error) {
      console.error("Failed to paste rows:", error);
    }
  };

  const handleSearchClick = () => {
    setIsSearchOpen(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <RundownHeaderPropsAdapter
        rundownId={activeRundownId}
        isShared={isShared}
        canEdit={canEdit}
        onSearchClick={handleSearchClick}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <RundownMainPropsAdapter
          rundownId={activeRundownId}
          isShared={isShared}
          canEdit={canEdit}
          currentSegmentId={currentSegmentId}
          searchMatches={searchMatches}
          currentSearchMatch={currentMatch}
        />
      </div>

      {/* Search Dialog */}
      <SearchDialog
        isOpen={isSearchOpen}
        searchQuery={searchQuery}
        replaceQuery={replaceQuery}
        matchCount={searchMatches.length}
        currentMatchIndex={currentMatchIndex}
        searchOptions={searchOptions}
        onClose={() => setIsSearchOpen(false)}
        onSearchChange={setSearchQuery}
        onReplaceChange={setReplaceQuery}
        onOptionsChange={setSearchOptions}
        onNextMatch={goToNextMatch}
        onPreviousMatch={goToPreviousMatch}
        onReplaceCurrentMatch={() => replaceCurrentMatch(handleUpdateItem)}
        onReplaceAllMatches={() => replaceAllMatches(handleUpdateItem)}
      />
    </div>
  );
};

export default RundownGrid;
