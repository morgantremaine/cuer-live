import { useEffect } from 'react';
import { TalentPreset } from '@/types/talentPreset';

interface UseRundownKeyboardShortcutsProps {
  onCopy: () => void;
  onPaste: (targetRowId?: string) => void;
  onAddRow: () => void;
  selectedRows: Set<string>;
  hasClipboardData: boolean;
  onShowcallerPlay: () => void;
  onShowcallerPause: () => void;
  onShowcallerForward: () => void;
  onShowcallerBackward: () => void;
  onShowcallerReset: () => void;
  isShowcallerPlaying: boolean;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  userRole?: string | null;
  talentPresets?: TalentPreset[];
  onInsertTalent?: (talentName: string) => void;
}

export const useRundownKeyboardShortcuts = ({
  onCopy,
  onPaste,
  onAddRow,
  selectedRows,
  hasClipboardData,
  onShowcallerPlay,
  onShowcallerPause,
  onShowcallerForward,
  onShowcallerBackward,
  onShowcallerReset,
  isShowcallerPlaying,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  userRole,
  talentPresets = [],
  onInsertTalent
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
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      const isInEditableElement = isEditableElement(e.target);

      // Talent preset shortcuts: Ctrl/Cmd + 1-9 (only in editable elements)
      if (isCtrlOrCmd && isInEditableElement && onInsertTalent && talentPresets.length > 0) {
        const key = e.key;
        if (key >= '1' && key <= '9') {
          const slot = parseInt(key, 10);
          const preset = talentPresets.find(p => p.slot === slot);
          
          if (preset) {
            e.preventDefault();
            console.log(`🎭 Inserting talent preset ${slot}:`, preset.name);
            
            // Insert talent name at cursor position
            const target = e.target as HTMLTextAreaElement | HTMLInputElement;
            const start = target.selectionStart || 0;
            const end = target.selectionEnd || 0;
            const currentValue = target.value || '';
            const newValue = currentValue.substring(0, start) + preset.name + currentValue.substring(end);
            
            // Update the value
            target.value = newValue;
            
            // Trigger change event to update state
            const changeEvent = new Event('input', { bubbles: true });
            target.dispatchEvent(changeEvent);
            
            // Set cursor position after inserted text
            const newCursorPos = start + preset.name.length;
            target.setSelectionRange(newCursorPos, newCursorPos);
            
            // Call callback if provided
            onInsertTalent(preset.name);
            
            return;
          }
        }
      }

      // Skip other shortcuts if user is typing in an editable element
      if (isInEditableElement) {
        if (import.meta.env.DEV) {
          console.log('🚫 Keyboard shortcut skipped: User is typing in editable element');
        }
        return;
      }

      if (import.meta.env.DEV) {
        console.log('⌨️ Key pressed:', e.key, '| Ctrl/Cmd:', isCtrlOrCmd, '| Selected:', selectedRows.size, '| HasClipboard:', hasClipboardData);
      }

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

      // Add row: Ctrl/Cmd + Shift + Enter
      if (isCtrlOrCmd && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        console.log('⌨️ Keyboard shortcut: Add new segment row');
        onAddRow();
      }

      // Undo: Ctrl/Cmd + Z (without Shift)
      if (isCtrlOrCmd && e.key.toLowerCase() === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        console.log('⌨️ Keyboard shortcut: Undo');
        onUndo();
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z
      if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z' && canRedo) {
        e.preventDefault();
        console.log('⌨️ Keyboard shortcut: Redo');
        onRedo();
        return;
      }

      // Showcaller controls (only when NOT using modifier keys)
      // Only allow showcaller controls for admin, manager, and showcaller roles
      const canUseShowcaller = userRole === 'admin' || userRole === 'manager' || userRole === 'showcaller';
      
      if (canUseShowcaller) {
        // Space bar: Play/Pause
        if (e.key === ' ' && !isCtrlOrCmd && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          console.log('⌨️ Keyboard shortcut: Showcaller play/pause');
          if (isShowcallerPlaying) {
            onShowcallerPause();
          } else {
            onShowcallerPlay();
          }
        }

        // Left or Up arrow: Backward
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && !isCtrlOrCmd && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          console.log('⌨️ Keyboard shortcut: Showcaller backward');
          onShowcallerBackward();
        }

        // Right or Down arrow: Forward
        if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && !isCtrlOrCmd && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          console.log('⌨️ Keyboard shortcut: Showcaller forward');
          onShowcallerForward();
        }

        // Enter/Return: Reset (without modifier keys)
        if (e.key === 'Enter' && !isCtrlOrCmd && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          console.log('⌨️ Keyboard shortcut: Showcaller reset');
          onShowcallerReset();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCopy, onPaste, onAddRow, selectedRows, hasClipboardData, onShowcallerPlay, onShowcallerPause, onShowcallerForward, onShowcallerBackward, onShowcallerReset, isShowcallerPlaying, onUndo, canUndo, onRedo, canRedo, userRole]);
};
