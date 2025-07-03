
import React from 'react';

interface UseRowEventHandlersProps {
  item: { id: string; type?: string };
  index: number;
  isSelected?: boolean;
  selectedRowsCount?: number;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDeleteRow: (id: string) => void;
  onDeleteSelectedRows: () => void;
  onCopySelectedRows: () => void;
  onCopyHeaderGroup?: (headerId: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onToggleFloat?: (id: string) => void;
  selectedRows?: Set<string>;
  onPasteRows?: (targetRowId?: string) => void;
  onClearSelection?: () => void;
  onJumpToHere?: (segmentId: string) => void;
  isCollapsed?: boolean;
}

export const useRowEventHandlers = ({
  item,
  index,
  isSelected = false,
  selectedRowsCount = 1,
  onRowSelect,
  onDeleteRow,
  onDeleteSelectedRows,
  onCopySelectedRows,
  onCopyHeaderGroup,
  onToggleColorPicker,
  onToggleFloat,
  selectedRows,
  onPasteRows,
  onClearSelection,
  onJumpToHere,
  isCollapsed = false
}: UseRowEventHandlersProps) => {
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
    // If this is a collapsed header and we have a header group copy handler, use it
    if (item.type === 'header' && isCollapsed && onCopyHeaderGroup) {
      onCopyHeaderGroup(item.id);
    } else {
      onCopySelectedRows();
    }
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
