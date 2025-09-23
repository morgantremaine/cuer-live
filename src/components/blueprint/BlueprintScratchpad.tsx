
import React, { useRef, useState } from 'react';
import ScratchpadEnhancedSidebar from './scratchpad/ScratchpadEnhancedSidebar';
import ScratchpadRichTextEditor from './scratchpad/ScratchpadRichTextEditor';
import ScratchpadStreamlinedToolbar from './scratchpad/ScratchpadStreamlinedToolbar';
import { useScratchpadNotes } from '@/hooks/blueprint/useScratchpadNotes';

interface FormatStates {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}

interface BlueprintScratchpadProps {
  rundownId: string;
  rundownTitle: string;
}

const BlueprintScratchpad = ({ rundownId, rundownTitle }: BlueprintScratchpadProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [formatStates, setFormatStates] = useState<FormatStates>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false
  });
  
  const {
    notes,
    activeNote,
    searchQuery,
    createNote,
    selectNote,
    updateNoteContent,
    renameNote,
    deleteNote,
    setSearchQuery,
    reorderNotes
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
      case 'bulletList':
        editor.insertBulletList?.();
        break;
      case 'checkbox':
        editor.insertCheckbox?.();
        break;
    }
  };

  const handleFormatStateChange = (states: FormatStates) => {
    setFormatStates(states);
  };

  return (
    <div className="w-full mt-8 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white">Notes</h2>
      </div>
      
      <div className="flex h-[600px]">
        <ScratchpadEnhancedSidebar
          notes={notes}
          activeNoteId={activeNote?.id || null}
          searchQuery={searchQuery}
          onSelectNote={selectNote}
          onCreateNote={createNote}
          onDeleteNote={deleteNote}
          onRenameNote={renameNote}
          onSearchChange={setSearchQuery}
          onReorderNotes={reorderNotes}
        />
        
        <div className="flex-1 flex flex-col">
          {activeNote && (
            <>
              <ScratchpadStreamlinedToolbar 
                onFormat={handleFormat} 
                formatStates={formatStates}
              />
              <ScratchpadRichTextEditor
                ref={editorRef}
                note={activeNote}
                onContentChange={updateNoteContent}
                onFormatStateChange={handleFormatStateChange}
              />
            </>
          )}
          
          {!activeNote && (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Select a note to start writing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlueprintScratchpad;
