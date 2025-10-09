import { useEffect } from 'react';

interface UseRundownKeyboardShortcutsProps {
  onCopy: () => void;
  onPaste: (targetRowId?: string) => void;
  selectedRows: Set<string>;
  hasClipboardData: boolean;
}

export const useRundownKeyboardShortcuts = ({
  onCopy,
  onPaste,
  selectedRows,
  hasClipboardData
}: UseRundownKeyboardShortcutsProps) => {
  useEffect(() => {
    const isEditableElement = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        target.isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an editable element
      if (isEditableElement(e.target)) {
        console.log('🚫 Keyboard shortcut skipped: User is typing in editable element');
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      console.log('⌨️ Key pressed:', e.key, '| Ctrl/Cmd:', isCtrlOrCmd, '| Selected:', selectedRows.size, '| HasClipboard:', hasClipboardData);

      // Copy: Ctrl/Cmd + C
      if (isCtrlOrCmd && e.key.toLowerCase() === 'c' && selectedRows.size > 0) {
        e.preventDefault();
        console.log('📋 Keyboard shortcut: Copy', selectedRows.size, 'rows');
        onCopy();
      }

      // Paste: Ctrl/Cmd + V
      if (isCtrlOrCmd && e.key.toLowerCase() === 'v' && hasClipboardData) {
        e.preventDefault();
        // Get the last selected row to paste after it
        const selectedIds = Array.from(selectedRows);
        const targetRowId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : undefined;
        console.log('📋 Keyboard shortcut: Paste rows', targetRowId ? `after row: ${targetRowId}` : 'at end');
        onPaste(targetRowId);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCopy, onPaste, selectedRows, hasClipboardData]);
};
