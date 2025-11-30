
import React from 'react';

interface UseRowEventHandlersProps {
  item: { id: string; type?: string };
  index: number;
  isSelected?: boolean;
  selectedRowsCount?: number;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => void;
  onDeleteRow: (id: string) => void;
  onDeleteSelectedRows: () => void;
  onCopySelectedRows: () => void;
  onToggleColorPicker: (itemId: string) => void;
  onToggleFloat?: (id: string) => void;
  selectedRows?: Set<string>;
  onPasteRows?: (targetRowId?: string) => void;
  onClearSelection?: () => void;
  onJumpToHere?: (segmentId: string) => void;
  // Header collapse props
  isHeaderCollapsed?: (headerId: string) => boolean;
  getHeaderGroupItemIds?: (headerId: string) => string[];
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
  onToggleColorPicker,
  onToggleFloat,
  selectedRows,
  onPasteRows,
  onClearSelection,
  onJumpToHere,
  isHeaderCollapsed,
  getHeaderGroupItemIds
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
      // Check if this is a collapsed header and get its group items
      let headerGroupItemIds: string[] | undefined;
      if (item.type === 'header' && isHeaderCollapsed && getHeaderGroupItemIds) {
        const isCollapsed = isHeaderCollapsed(item.id);
        if (isCollapsed) {
          headerGroupItemIds = getHeaderGroupItemIds(item.id);
        }
      }
      
      onRowSelect(item.id, index, e.shiftKey, e.ctrlKey || e.metaKey, headerGroupItemIds);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // Check if there's selected text at the moment of right-click
    const selection = window.getSelection();
    const hasTextSelection = selection && selection.toString().length > 0;
    
    if (hasTextSelection) {
      const target = e.target as HTMLElement;
      
      // Check if the click target or its ancestors are in an editable area
      const isInEditableArea = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.contentEditable === 'true' ||
        target.closest('input') !== null ||
        target.closest('textarea') !== null ||
        target.closest('[contenteditable="true"]') !== null;
      
      // Also check if the active element is an editable area
      const activeElement = document.activeElement as HTMLElement;
      const isActiveElementEditable = 
        activeElement?.tagName === 'INPUT' || 
        activeElement?.tagName === 'TEXTAREA' || 
        activeElement?.contentEditable === 'true';
      
      // If text is selected in an editable area, let browser's native menu show
      if (isInEditableArea || isActiveElementEditable) {
        e.stopPropagation(); // Prevents ContextMenu from triggering
        return; // Don't select the row, just let native menu appear
      }
    }
    
    // No text selection in editable area - proceed with app's context menu
    // Just ensure the row is selected if not already
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
