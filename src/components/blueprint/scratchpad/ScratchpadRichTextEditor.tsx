
import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { ScratchpadNote } from '@/types/scratchpad';

interface ScratchpadRichTextEditorProps {
  note: ScratchpadNote;
  onContentChange: (content: string) => void;
  onFormatStateChange?: (formatStates: FormatStates) => void;
}

interface FormatStates {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}

const ScratchpadRichTextEditor = forwardRef<HTMLDivElement, ScratchpadRichTextEditorProps>(({
  note,
  onContentChange,
  onFormatStateChange
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [formatStates, setFormatStates] = useState<FormatStates>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false
  });

  // Expose the editor ref to parent component
  useImperativeHandle(ref, () => editorRef.current!, []);

  // Check current formatting state at cursor position
  const updateFormatStates = useCallback(() => {
    const states = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough')
    };
    setFormatStates(states);
    onFormatStateChange?.(states);
  }, [onFormatStateChange]);

  // Apply formatting to selected text
  const applyFormat = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML);
      // Update format states after applying formatting
      setTimeout(updateFormatStates, 0);
    }
  }, [onContentChange, updateFormatStates]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML);
      updateFormatStates();
    }
  }, [onContentChange, updateFormatStates]);

  // Handle selection changes to update format states
  const handleSelectionChange = useCallback(() => {
    updateFormatStates();
  }, [updateFormatStates]);

  // Set initial content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== note.content) {
      editorRef.current.innerHTML = note.content;
    }
  }, [note.content, note.id]);

  // Add selection change listener
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Expose formatting functions for toolbar
  useEffect(() => {
    const element = editorRef.current;
    if (element) {
      (element as any).applyBold = () => applyFormat('bold');
      (element as any).applyItalic = () => applyFormat('italic');
      (element as any).applyUnderline = () => applyFormat('underline');
      (element as any).applyStrikethrough = () => applyFormat('strikeThrough');
      (element as any).insertBulletList = () => applyFormat('insertUnorderedList');
      (element as any).insertCheckbox = () => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          const range = selection.getRangeAt(0);
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'mr-2 rounded';
          range.insertNode(checkbox);
          selection.collapseToEnd();
        } else {
          document.execCommand('insertHTML', false, '<div><input type="checkbox" class="mr-2 rounded"> </div>');
        }
        handleInput();
      };
    }
  }, [applyFormat, handleInput]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          applyFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          applyFormat('underline');
          break;
      }
    }
  }, [applyFormat]);

  return (
    <div
      ref={editorRef}
      contentEditable
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onMouseUp={handleSelectionChange}
      onKeyUp={handleSelectionChange}
      className="flex-1 p-4 text-white bg-transparent outline-none text-base leading-relaxed min-h-[400px] overflow-auto scratchpad-editor"
      style={{ 
        wordWrap: 'break-word',
        whiteSpace: 'pre-wrap'
      }}
      suppressContentEditableWarning={true}
      data-placeholder="Start writing your note..."
    />
  );
});

ScratchpadRichTextEditor.displayName = 'ScratchpadRichTextEditor';

export default ScratchpadRichTextEditor;
