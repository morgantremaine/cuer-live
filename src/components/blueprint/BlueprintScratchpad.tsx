
import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import ScratchpadSidebar from './scratchpad/ScratchpadSidebar';
import ScratchpadNoteEditor from './scratchpad/ScratchpadNoteEditor';
import ScratchpadToolbar from './scratchpad/ScratchpadToolbar';
import SaveStatus from './scratchpad/SaveStatus';
import { useScratchpadNotes } from '@/hooks/blueprint/useScratchpadNotes';

interface BlueprintScratchpadProps {
  rundownId: string;
  rundownTitle: string;
}

const BlueprintScratchpad = ({ rundownId, rundownTitle }: BlueprintScratchpadProps) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    notes,
    activeNote,
    isEditing,
    createNote,
    selectNote,
    updateNoteContent,
    deleteNote,
    toggleEditing
  } = useScratchpadNotes(rundownId);

  const handleFormat = (action: string) => {
    const editor = editorRef.current as any;
    if (!editor) return;

    switch (action) {
      case 'bold':
        editor.applyBold?.();
        break;
      case 'italic':
        editor.applyItalic?.();
        break;
      case 'underline':
        editor.applyUnderline?.();
        break;
      case 'strikethrough':
        editor.applyStrikethrough?.();
        break;
      case 'bullet':
        editor.insertBulletList?.();
        break;
      case 'checkbox':
        editor.insertCheckbox?.();
        break;
    }
  };

  return (
    <Card className="w-full mt-8 bg-gray-800 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
            <CardTitle className="text-xl text-white">Scratchpad</CardTitle>
            <SaveStatus status="saved" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex h-[600px]">
          <ScratchpadSidebar
            notes={notes}
            activeNoteId={activeNote?.id || null}
            onSelectNote={selectNote}
            onCreateNote={createNote}
            onDeleteNote={deleteNote}
          />
          
          <div className="flex-1 flex flex-col">
            <ScratchpadToolbar
              isEditing={isEditing}
              onToggleEdit={toggleEditing}
              onFormat={handleFormat}
            />
            
            <div className="flex-1 overflow-auto">
              {activeNote ? (
                <ScratchpadNoteEditor
                  note={activeNote}
                  isEditing={isEditing}
                  onContentChange={updateNoteContent}
                  onStartEditing={toggleEditing}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>Select a note to start writing</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BlueprintScratchpad;
