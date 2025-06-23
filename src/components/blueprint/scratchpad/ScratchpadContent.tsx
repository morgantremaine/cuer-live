
import React from 'react';
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
  if (isEditing) {
    return (
      <Textarea
        ref={textareaRef}
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Add your show notes, reminders, and scratchpad content here..."
        className="min-h-[300px] resize-y text-base leading-relaxed bg-gray-900 border-gray-600 text-white placeholder-gray-400"
        autoFocus
      />
    );
  }

  return (
    <div 
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
