
import React from 'react';

interface UseRowEventHandlersProps {
  item: { id: string };
  index: number;
  isSelected?: boolean;
  selectedRowsCount?: number;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDeleteRow: (id: string) => void;
  onDeleteSelectedRows: () => void;
  onCopySelectedRows: () => void;
  onToggleColorPicker: (itemId: string) => void;
  onToggleFloat?: (id: string) => void;
  selectedRows?: Set<string>;
  onPasteRows?: () => void;
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
  onPasteRows
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
    console.log('Right-click detected on row:', item.id);
    e.preventDefault();
    e.stopPropagation();
    
    if (onRowSelect) {
      onRowSelect(item.id, index, false, false);
    }
    
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      (target as HTMLInputElement | HTMLTextAreaElement).blur();
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
    }
  };

  const handleContextMenuColor = () => {
    onToggleColorPicker(item.id);
  };

  const handleContextMenuPaste = () => {
    if (onPasteRows) {
      onPasteRows();
    }
  };

  return {
    handleRowClick,
    handleContextMenu,
    handleContextMenuCopy,
    handleContextMenuDelete,
    handleContextMenuFloat,
    handleContextMenuColor,
    handleContextMenuPaste
  };
};
