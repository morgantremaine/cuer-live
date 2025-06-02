
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, Underline } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useBlueprintStorage } from '@/hooks/useBlueprintStorage';
import { useBlueprintState } from '@/hooks/useBlueprintState';

interface BlueprintScratchpadProps {
  rundownId: string;
  rundownTitle: string;
  initialNotes?: string;
  onNotesChange?: (notes: string) => void;
}

const BlueprintScratchpad = ({ rundownId, rundownTitle, initialNotes = '', onNotesChange }: BlueprintScratchpadProps) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { savedBlueprint, saveBlueprint } = useBlueprintStorage(rundownId);

  // Load notes from saved blueprint when available
  useEffect(() => {
    if (savedBlueprint?.notes && notes === initialNotes) {
      setNotes(savedBlueprint.notes);
    }
  }, [savedBlueprint, initialNotes]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    onNotesChange?.(value);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      autoSaveNotes(value);
    }, 2000);
  };

  const autoSaveNotes = async (notesToSave: string) => {
    setIsSaving(true);
    try {
      // If we have a saved blueprint, use its data, otherwise use empty lists
      const listsToSave = savedBlueprint?.lists || [];
      const showDate = savedBlueprint?.show_date;
      
      console.log('Auto-saving notes:', { notesToSave, rundownTitle, listsToSave });
      
      await saveBlueprint(
        rundownTitle,
        listsToSave,
        showDate,
        true, // silent save
        notesToSave
      );
    } catch (error) {
      console.error('Failed to auto-save notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
    <Card className="w-full mt-8 bg-gray-800 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl text-white">Show Scratchpad</CardTitle>
            {isSaving && <span className="text-xs text-blue-400">Saving...</span>}
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBold}
                  className="p-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleItalic}
                  className="p-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnderline}
                  className="p-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  title="Underline"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulletList}
                  className="p-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
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
              className={isEditing ? "" : "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"}
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
            className="min-h-[300px] resize-y text-base leading-relaxed bg-gray-900 border-gray-600 text-white placeholder-gray-400"
            autoFocus
          />
        ) : (
          <div 
            className="min-h-[300px] p-3 border rounded-md bg-gray-900 border-gray-600 whitespace-pre-wrap text-base leading-relaxed cursor-pointer text-white"
            onClick={() => setIsEditing(true)}
          >
            {notes || (
              <span className="text-gray-400 italic">
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
