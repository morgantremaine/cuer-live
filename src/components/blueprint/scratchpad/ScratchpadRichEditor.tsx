
import React, { useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface ScratchpadRichEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: number;
}

const ScratchpadRichEditor = ({
  content,
  onChange,
  placeholder = "Add your show notes, reminders, and scratchpad content here...",
  height = 300
}: ScratchpadRichEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Apply formatting to selected text
  const applyFormatting = (startTag: string, endTag: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText = textarea.value.substring(0, start) + startTag + selectedText + endTag + textarea.value.substring(end);
    
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + startTag.length, end + startTag.length);
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const newText = textarea.value.substring(0, start) + text + textarea.value.substring(start);
    
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  // Expose formatting functions to parent
  useEffect(() => {
    const element = textareaRef.current;
    if (element) {
      (element as any).applyBold = () => applyFormatting('**', '**');
      (element as any).applyItalic = () => applyFormatting('*', '*');
      (element as any).applyUnderline = () => applyFormatting('<u>', '</u>');
      (element as any).applyStrikethrough = () => applyFormatting('~~', '~~');
      (element as any).applyHeader = (level: number) => {
        const hashes = '#'.repeat(level);
        insertAtCursor(`${hashes} `);
      };
      (element as any).insertBulletList = () => insertAtCursor('• ');
      (element as any).insertNumberedList = () => insertAtCursor('1. ');
      (element as any).insertCheckbox = () => insertAtCursor('- [ ] ');
      (element as any).insertLink = () => applyFormatting('[', '](url)');
      (element as any).insertCodeBlock = () => applyFormatting('```\n', '\n```');
      (element as any).insertTable = () => {
        const tableTemplate = `
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
`;
        insertAtCursor(tableTemplate.trim());
      };
    }
  }, []);

  return (
    <Textarea
      ref={textareaRef}
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="resize-y text-base leading-relaxed bg-gray-900 border-gray-600 text-white placeholder-gray-400 font-mono"
      style={{ height: `${height}px`, minHeight: '300px' }}
      autoFocus
    />
  );
};

export default ScratchpadRichEditor;
