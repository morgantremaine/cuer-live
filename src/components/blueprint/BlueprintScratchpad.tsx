
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, Underline } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface BlueprintScratchpadProps {
  rundownId: string;
  initialNotes?: string;
  onNotesChange?: (notes: string) => void;
}

const BlueprintScratchpad = ({ rundownId, initialNotes = '', onNotesChange }: BlueprintScratchpadProps) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    onNotesChange?.(value);
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = notes.substring(start, end);
    const newText = notes.substring(0, start) + before + selectedText + after + notes.substring(end);
    
    handleNotesChange(newText);
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleBold = () => insertText('**', '**');
  const handleItalic = () => insertText('*', '*');
  const handleUnderline = () => insertText('__', '__');
  const handleBulletList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = notes.lastIndexOf('\n', start - 1) + 1;
    const newText = notes.substring(0, lineStart) + '• ' + notes.substring(lineStart);
    
    handleNotesChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2);
    }, 0);
  };

  return (
    <Card className="w-full mt-8">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-white">Show Scratchpad</CardTitle>
          <div className="flex items-center gap-2">
            {isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBold}
                  className="p-2"
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleItalic}
                  className="p-2"
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnderline}
                  className="p-2"
                  title="Underline"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulletList}
                  className="p-2"
                  title="Bullet List"
                >
                  <List className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Done' : 'Edit'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Add your show notes, reminders, and scratchpad content here..."
            className="min-h-[300px] resize-y text-base leading-relaxed"
            autoFocus
          />
        ) : (
          <div 
            className="min-h-[300px] p-3 border rounded-md bg-muted/50 whitespace-pre-wrap text-base leading-relaxed cursor-pointer"
            onClick={() => setIsEditing(true)}
          >
            {notes || (
              <span className="text-muted-foreground italic">
                Click to add your show notes, reminders, and scratchpad content...
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BlueprintScratchpad;
