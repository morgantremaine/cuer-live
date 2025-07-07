
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, FileText, Search, MoreVertical, Trash2, Edit3, GripVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScratchpadNote } from '@/types/scratchpad';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ScratchpadEnhancedSidebarProps {
  notes: ScratchpadNote[];
  activeNoteId: string | null;
  searchQuery: string;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  onRenameNote: (noteId: string, newTitle: string) => void;
  onSearchChange: (query: string) => void;
  onReorderNotes?: (startIndex: number, endIndex: number) => void;
}

interface SortableNoteItemProps {
  note: ScratchpadNote;
  isActive: boolean;
  editingNoteId: string | null;
  editingTitle: string;
  onSelectNote: (noteId: string) => void;
  onStartEditing: (note: ScratchpadNote) => void;
  onDeleteNote: (noteId: string) => void;
  setEditingTitle: (title: string) => void;
  saveTitle: () => void;
  cancelEditing: () => void;
  formatDate: (dateString: string) => string;
}

const SortableNoteItem = ({
  note,
  isActive,
  editingNoteId,
  editingTitle,
  onSelectNote,
  onStartEditing,
  onDeleteNote,
  setEditingTitle,
  saveTitle,
  cancelEditing,
  formatDate
}: SortableNoteItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group p-3 rounded-md cursor-pointer transition-colors mb-2 ${
        isActive 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
      onClick={() => onSelectNote(note.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-400 hover:text-gray-200"
          >
            <GripVertical className="h-3 w-3" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 flex-shrink-0" />
              {editingNoteId === note.id ? (
                <Input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  className="h-6 px-1 text-sm bg-transparent border-gray-400"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h4 className="font-medium truncate">{note.title}</h4>
              )}
            </div>
            <p className="text-xs opacity-50">
              {formatDate(note.updatedAt)}
            </p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onStartEditing(note)}>
              <Edit3 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDeleteNote(note.id)}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const ScratchpadEnhancedSidebar = ({
  notes,
  activeNoteId,
  searchQuery,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onRenameNote,
  onSearchChange,
  onReorderNotes
}: ScratchpadEnhancedSidebarProps) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    // Strip HTML tags and get plain text preview
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    return plainText.substring(0, 50) + (plainText.length > 50 ? '...' : '');
  };

  const startEditing = (note: ScratchpadNote) => {
    setEditingNoteId(note.id);
    setEditingTitle(note.title);
  };

  const saveTitle = () => {
    if (editingNoteId && editingTitle.trim()) {
      onRenameNote(editingNoteId, editingTitle.trim());
    }
    setEditingNoteId(null);
    setEditingTitle('');
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingTitle('');
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id && onReorderNotes) {
      const oldIndex = filteredNotes.findIndex(note => note.id === active.id);
      const newIndex = filteredNotes.findIndex(note => note.id === over.id);
      
      // Map back to original notes array
      const originalOldIndex = notes.findIndex(note => note.id === active.id);
      const originalNewIndex = notes.findIndex(note => note.id === over.id);
      
      onReorderNotes(originalOldIndex, originalNewIndex);
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getPreview(note.content).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-3 border-b border-gray-700 space-y-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateNote}
            className="text-gray-300 hover:text-white hover:bg-gray-600 gap-2"
          >
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={filteredNotes.map(note => note.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredNotes.map((note) => (
                <SortableNoteItem
                  key={note.id}
                  note={note}
                  isActive={activeNoteId === note.id}
                  editingNoteId={editingNoteId}
                  editingTitle={editingTitle}
                  onSelectNote={onSelectNote}
                  onStartEditing={startEditing}
                  onDeleteNote={onDeleteNote}
                  setEditingTitle={setEditingTitle}
                  saveTitle={saveTitle}
                  cancelEditing={cancelEditing}
                  formatDate={formatDate}
                />
              ))}
            </SortableContext>
          </DndContext>
          
          {filteredNotes.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              {searchQuery ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No notes found</p>
                  <p className="text-sm">Try a different search term</p>
                </>
              ) : (
                <>
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No notes yet</p>
                  <p className="text-sm">Click + to create your first note</p>
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ScratchpadEnhancedSidebar;
