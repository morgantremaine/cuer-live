
import React from 'react';
import { Textarea } from '@/components/ui/textarea';

interface ScratchpadContentProps {
  notes: string;
  isEditing: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onNotesChange: (value: string) => void;
  onStartEditing: () => void;
}

const renderMarkdownText = (text: string) => {
  // Split text by lines to preserve line breaks
  const lines = text.split('\n');
  
  return lines.map((line, lineIndex) => {
    // Process markdown formatting in each line
    const parts = [];
    let currentIndex = 0;
    let partIndex = 0;
    
    // Regular expression to match markdown patterns
    const markdownRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|<u>([^<]+)<\/u>|~~([^~]+)~~)/g;
    let match;
    
    while ((match = markdownRegex.exec(line)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(
          <span key={`text-${lineIndex}-${partIndex++}`}>
            {line.substring(currentIndex, match.index)}
          </span>
        );
      }
      
      // Add the formatted text
      const fullMatch = match[0];
      const boldText = match[2];
      const italicText = match[3];
      const underlineText = match[4];
      const strikethroughText = match[5];
      
      if (boldText) {
        parts.push(
          <strong key={`bold-${lineIndex}-${partIndex++}`}>{boldText}</strong>
        );
      } else if (italicText) {
        parts.push(
          <em key={`italic-${lineIndex}-${partIndex++}`}>{italicText}</em>
        );
      } else if (underlineText) {
        parts.push(
          <u key={`underline-${lineIndex}-${partIndex++}`}>{underlineText}</u>
        );
      } else if (strikethroughText) {
        parts.push(
          <span key={`strikethrough-${lineIndex}-${partIndex++}`} className="line-through">
            {strikethroughText}
          </span>
        );
      }
      
      currentIndex = match.index + fullMatch.length;
    }
    
    // Add remaining text
    if (currentIndex < line.length) {
      parts.push(
        <span key={`text-${lineIndex}-${partIndex++}`}>
          {line.substring(currentIndex)}
        </span>
      );
    }
    
    // If no formatting found, just return the line
    if (parts.length === 0) {
      parts.push(<span key={`line-${lineIndex}`}>{line}</span>);
    }
    
    return (
      <div key={lineIndex}>
        {parts}
        {lineIndex < lines.length - 1 && <br />}
      </div>
    );
  });
};

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
      className="min-h-[300px] p-3 border rounded-md bg-gray-900 border-gray-600 text-base leading-relaxed cursor-pointer text-white"
      onClick={onStartEditing}
    >
      {notes ? (
        <div className="whitespace-pre-wrap">
          {renderMarkdownText(notes)}
        </div>
      ) : (
        <span className="text-gray-400 italic">
          Click to add your show notes, reminders, and scratchpad content...
        </span>
      )}
    </div>
  );
};

export default ScratchpadContent;
