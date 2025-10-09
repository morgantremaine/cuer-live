import { useEffect } from 'react';

interface UseRundownKeyboardShortcutsProps {
  onCopy: () => void;
  onPaste: () => void;
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
      if (isEditableElement(e.target)) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Copy: Ctrl/Cmd + C
      if (isCtrlOrCmd && e.key.toLowerCase() === 'c' && selectedRows.size > 0) {
        e.preventDefault();
        console.log('📋 Keyboard shortcut: Copy', selectedRows.size, 'rows');
        onCopy();
      }

      // Paste: Ctrl/Cmd + V
      if (isCtrlOrCmd && e.key.toLowerCase() === 'v' && hasClipboardData) {
        e.preventDefault();
        console.log('📋 Keyboard shortcut: Paste rows');
        onPaste();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCopy, onPaste, selectedRows, hasClipboardData]);
};
