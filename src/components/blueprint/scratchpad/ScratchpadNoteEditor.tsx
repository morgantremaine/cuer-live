
import React, { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ScratchpadNote } from '@/types/scratchpad';
import { sanitizeRichText } from '@/utils/sanitize';

interface ScratchpadNoteEditorProps {
  note: ScratchpadNote;
  isEditing: boolean;
  onContentChange: (content: string) => void;
  onStartEditing: () => void;
}

const ScratchpadNoteEditor = ({
  note,
  isEditing,
  onContentChange,
  onStartEditing
}: ScratchpadNoteEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormatting = (startTag: string, endTag: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText = textarea.value.substring(0, start) + startTag + selectedText + endTag + textarea.value.substring(end);
    
    onContentChange(newText);
    
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
    
    onContentChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  // Expose formatting functions
  React.useEffect(() => {
    const element = textareaRef.current;
    if (element) {
      (element as any).applyBold = () => applyFormatting('**', '**');
      (element as any).applyItalic = () => applyFormatting('*', '*');
      (element as any).applyUnderline = () => applyFormatting('<u>', '</u>');
      (element as any).applyStrikethrough = () => applyFormatting('~~', '~~');
      (element as any).insertBulletList = () => insertAtCursor('• ');
      (element as any).insertCheckbox = () => insertAtCursor('☐ ');
    }
  }, []);

  const renderFormattedContent = (content: string) => {
    if (!content) return <span className="text-gray-400 italic">Click to start writing...</span>;

    return content
      .split('\n')
      .map((line, index) => {
        let processedLine = line
          // Bold
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
          // Italic
          .replace(/\*([^*]+?)\*/g, '<em class="italic">$1</em>')
          // Underline
          .replace(/<u>(.*?)<\/u>/g, '<u class="underline">$1</u>')
          // Strikethrough
          .replace(/~~(.*?)~~/g, '<span class="line-through">$1</span>')
          // Checkboxes
          .replace(/☐\s(.*)/, '<label class="flex items-center gap-2"><input type="checkbox" class="rounded" /> <span>$1</span></label>')
          .replace(/☑\s(.*)/, '<label class="flex items-center gap-2"><input type="checkbox" checked class="rounded" /> <span>$1</span></label>')
          // Bullet points
          .replace(/^•\s(.*)/, '<div class="flex items-start gap-2"><span class="text-blue-400">•</span><span>$1</span></div>');

        return (
          <div 
            key={index}
            className="min-h-[1.5rem]"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(processedLine || '&nbsp;') }}
          />
        );
      });
  };

  if (isEditing) {
    return (
      <Textarea
        ref={textareaRef}
        value={note.content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="Start writing your note..."
        className="min-h-[400px] resize-none border-none bg-transparent text-white placeholder-gray-400 focus:ring-0 focus:outline-none text-base leading-relaxed font-mono"
        autoFocus
      />
    );
  }

  return (
    <div 
      className="min-h-[400px] p-3 text-white cursor-pointer text-base leading-relaxed"
      onClick={onStartEditing}
    >
      {renderFormattedContent(note.content)}
    </div>
  );
};

export default ScratchpadNoteEditor;
