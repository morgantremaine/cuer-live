
import React, { useEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface ScratchpadContentProps {
  notes: string;
  isEditing: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onNotesChange: (value: string) => void;
  onStartEditing: () => void;
}

const ScratchpadContent = ({
  notes,
  isEditing,
  textareaRef,
  onNotesChange,
  onStartEditing
}: ScratchpadContentProps) => {
  const [displayHeight, setDisplayHeight] = useState<number | null>(null);

  // Measure the display div height when not editing
  useEffect(() => {
    if (!isEditing) {
      const displayDiv = document.querySelector('[data-scratchpad-display]') as HTMLElement;
      if (displayDiv) {
        // Use setTimeout to ensure the div has rendered with content
        setTimeout(() => {
          const height = displayDiv.scrollHeight;
          setDisplayHeight(Math.max(height, 300)); // Minimum 300px
        }, 0);
      }
    }
  }, [notes, isEditing]);

  if (isEditing) {
    const textareaHeight = displayHeight ? `${displayHeight}px` : '300px';
    
    return (
      <Textarea
        ref={textareaRef}
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Add your show notes, reminders, and scratchpad content here..."
        className="resize-y text-base leading-relaxed bg-gray-900 border-gray-600 text-white placeholder-gray-400"
        style={{ height: textareaHeight, minHeight: '300px' }}
        autoFocus
      />
    );
  }

  return (
    <div 
      data-scratchpad-display
      className="min-h-[300px] p-3 border rounded-md bg-gray-900 border-gray-600 whitespace-pre-wrap text-base leading-relaxed cursor-pointer text-white"
      onClick={onStartEditing}
    >
      {notes || (
        <span className="text-gray-400 italic">
          Click to add your show notes, reminders, and scratchpad content...
        </span>
      )}
    </div>
  );
};

export default ScratchpadContent;
