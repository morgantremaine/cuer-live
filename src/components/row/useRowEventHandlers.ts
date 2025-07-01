
import React from 'react';

interface UseRowEventHandlersProps {
  item: { id: string };
  index: number;
  isSelected?: boolean;
  selectedRowsCount?: number;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDeleteRow: (id: string) => void;
  onDeleteSelectedRows: () => void;
  onCopySelectedRows: () => void;
  onToggleColorPicker: (itemId: string) => void;
  onToggleFloat?: (id: string) => void;
  selectedRows?: Set<string>;
  onPasteRows?: (targetRowId?: string) => void;
  onClearSelection?: () => void;
  onJumpToHere?: (segmentId: string) => void;
}

export const useRowEventHandlers = ({
  item,
  index,
  isSelected = false,
  selectedRowsCount = 1,
  onRowSelect,
  onDragStart,
  onDeleteRow,
  onDeleteSelectedRows,
  onCopySelectedRows,
  onToggleColorPicker,
  onToggleFloat,
  selectedRows,
  onPasteRows,
  onClearSelection,
  onJumpToHere
}: UseRowEventHandlersProps) => {
  const handleDragStart = (e: React.DragEvent) => {
    onDragStart(e, index);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    
    if (isTextInput) {
      const row = e.currentTarget as HTMLElement;
      row.setAttribute('draggable', 'false');
      
      setTimeout(() => {
        if (row) {
          row.setAttribute('draggable', 'true');
        }
      }, 100);
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const isResizeHandle = target.classList.contains('resize-handle') || target.closest('.resize-handle');
    
    if (isInput || isResizeHandle) {
      return;
    }
    
    e.stopPropagation();
    
    if (onRowSelect) {
      onRowSelect(item.id, index, e.shiftKey, e.ctrlKey || e.metaKey);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // Select the row if not already selected
    if (onRowSelect && !isSelected) {
      onRowSelect(item.id, index, false, false);
    }
  };

  const handleContextMenuCopy = () => {
    onCopySelectedRows();
  };

  const handleContextMenuDelete = () => {
    if (isSelected && selectedRowsCount > 1) {
      onDeleteSelectedRows();
    } else {
      onDeleteRow(item.id);
    }
  };

  const handleContextMenuFloat = () => {
    if (onToggleFloat) {
      if (isSelected && selectedRowsCount > 1 && selectedRows) {
        selectedRows.forEach(selectedId => {
          onToggleFloat(selectedId);
        });
      } else {
        onToggleFloat(item.id);
      }
      
      // Clear selection after floating
      if (onClearSelection) {
        onClearSelection();
      }
    }
  };

  const handleContextMenuColor = () => {
    onToggleColorPicker(item.id);
  };

  const handleContextMenuPaste = () => {
    if (onPasteRows) {
      // Pass the current item's ID as the target for pasting
      onPasteRows(item.id);
    }
  };

  const handleJumpToHere = () => {
    if (onJumpToHere) {
      onJumpToHere(item.id);
    }
  };

  return {
    handleDragStart,
    handleMouseDown,
    handleRowClick,
    handleContextMenu,
    handleContextMenuCopy,
    handleContextMenuDelete,
    handleContextMenuFloat,
    handleContextMenuColor,
    handleContextMenuPaste,
    handleJumpToHere
  };
};
