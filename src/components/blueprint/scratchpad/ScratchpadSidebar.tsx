
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, FileText } from 'lucide-react';
import { ScratchpadNote } from '@/types/scratchpad';

interface ScratchpadSidebarProps {
  notes: ScratchpadNote[];
  activeNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
}

const ScratchpadSidebar = ({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote
}: ScratchpadSidebarProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPreview = (content: string) => {
    const plainText = content
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/<u>(.*?)<\/u>/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/[☐☑]\s/g, '')
      .replace(/•\s/g, '');
    
    return plainText.split('\n')[0].substring(0, 50) + (plainText.length > 50 ? '...' : '');
  };

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Notes</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateNote}
            className="text-gray-300 hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`p-3 rounded-md cursor-pointer transition-colors mb-2 ${
                activeNoteId === note.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => onSelectNote(note.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <h4 className="font-medium truncate">{note.title}</h4>
                  </div>
                  <p className="text-sm opacity-75 line-clamp-2">
                    {getPreview(note.content) || 'No content'}
                  </p>
                  <p className="text-xs opacity-50 mt-1">
                    {formatDate(note.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {notes.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notes yet</p>
              <p className="text-sm">Click + to create your first note</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ScratchpadSidebar;
