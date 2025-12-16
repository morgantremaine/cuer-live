import { useEffect } from 'react';
import { TalentPreset } from '@/types/talentPreset';

// Hex to color name mapping for talent preset formatting
const HEX_TO_COLOR_NAME: Record<string, string> = {
  '#ef4444': 'red',
  '#f97316': 'orange',
  '#f59e0b': 'amber',
  '#eab308': 'yellow',
  '#84cc16': 'lime',
  '#22c55e': 'green',
  '#10b981': 'emerald',
  '#14b8a6': 'teal',
  '#06b6d4': 'cyan',
  '#3b82f6': 'blue',
  '#6366f1': 'indigo',
  '#8b5cf6': 'violet',
  '#a855f7': 'purple',
  '#ec4899': 'pink',
  '#f43f5e': 'rose',
};

const getColorNameFromHex = (hex: string): string | null => {
  return HEX_TO_COLOR_NAME[hex.toLowerCase()] || null;
};

interface UseRundownKeyboardShortcutsProps {
  onCopy: () => void;
  onPaste: (targetRowId?: string) => void;
  onAddRow: () => void;
  onDelete: () => void;
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
  onScrollToCurrentSegment?: () => void;
}

export const useRundownKeyboardShortcuts = ({
  onCopy,
  onPaste,
  onAddRow,
  onDelete,
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
  onInsertTalent,
  onScrollToCurrentSegment
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

      // Talent preset shortcuts: Alt + 1-9 on Windows, Ctrl + 1-9 on Mac (only in editable elements)
      // Mac uses Ctrl because Cmd+Shift+3/4 are screenshot shortcuts and Ctrl+numbers is unused in browsers
      // Windows uses Alt because Ctrl + numbers switches browser tabs
      const talentModifierActive = isMac ? e.ctrlKey : e.altKey;
      if (talentModifierActive && isInEditableElement && onInsertTalent && talentPresets.length > 0) {
        const key = e.key;
        if ((key >= '0' && key <= '9')) {
          const slot = parseInt(key, 10);
          const preset = talentPresets.find(p => p.slot === slot);
          
          if (preset) {
            e.preventDefault();
            
            // If color is set, format as [NAME {color}], otherwise plain text
            let insertText = preset.name;
            if (preset.color) {
              const colorName = getColorNameFromHex(preset.color);
              if (colorName) {
                insertText = `[${preset.name} {${colorName}}]`;
              } else {
                insertText = `[${preset.name}]`;
              }
            }
            
            console.log(`🎭 Inserting talent preset ${slot}:`, insertText);
            
            // Insert formatted text at cursor position
            const target = e.target as HTMLTextAreaElement | HTMLInputElement;
            const start = target.selectionStart || 0;
            const end = target.selectionEnd || 0;
            const currentValue = target.value || '';
            const newValue = currentValue.substring(0, start) + insertText + currentValue.substring(end);
            
            // Use native setter for React-compatible state update
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              target.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
              'value'
            )?.set;
            
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(target, newValue);
            }
            
            // Dispatch InputEvent to trigger React's onChange
            const inputEvent = new InputEvent('input', { bubbles: true, cancelable: true });
            target.dispatchEvent(inputEvent);
            
            // Set cursor position after inserted text
            const newCursorPos = start + insertText.length;
            setTimeout(() => {
              target.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
            
            // Call callback with formatted text
            onInsertTalent(insertText);
            
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

      // Delete selected rows: Backspace or Delete key
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedRows.size > 0) {
        e.preventDefault();
        console.log('⌨️ Keyboard shortcut: Delete', selectedRows.size, 'row(s)');
        onDelete();
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

      // Backtick: Scroll to current showcaller segment (no modifiers)
      if (e.key === '`' && !isCtrlOrCmd && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        console.log('⌨️ Keyboard shortcut: Scroll to current segment');
        onScrollToCurrentSegment?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCopy, onPaste, onAddRow, onDelete, selectedRows, hasClipboardData, onShowcallerPlay, onShowcallerPause, onShowcallerForward, onShowcallerBackward, onShowcallerReset, isShowcallerPlaying, onUndo, canUndo, onRedo, canRedo, userRole, talentPresets, onInsertTalent, onScrollToCurrentSegment]);
};
