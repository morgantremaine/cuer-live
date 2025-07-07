import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, FileText, Minimize2, Maximize2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFloatingNotes } from '@/hooks/useFloatingNotes';
import ScratchpadRichTextEditor from '@/components/blueprint/scratchpad/ScratchpadRichTextEditor';
import ScratchpadStreamlinedToolbar from '@/components/blueprint/scratchpad/ScratchpadStreamlinedToolbar';

interface FloatingNotesWindowProps {
  rundownId: string;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
}

interface FormatStates {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}

export const FloatingNotesWindow: React.FC<FloatingNotesWindowProps> = ({
  rundownId,
  onClose,
  initialPosition = { x: 100, y: 100 }
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [formatStates, setFormatStates] = useState<FormatStates>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false
  });

  // Use the floating notes hook
  const {
    notes,
    activeNote,
    isLoading,
    createNote,
    selectNote,
    updateNoteContent,
    renameNote,
    deleteNote
  } = useFloatingNotes(rundownId);

  // Mouse event handlers for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!windowRef.current) return;
    
    const rect = windowRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Constrain window to viewport
  useEffect(() => {
    const constrainPosition = () => {
      if (!windowRef.current) return;
      
      const rect = windowRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      setPosition(prev => ({
        x: Math.max(0, Math.min(prev.x, viewportWidth - rect.width)),
        y: Math.max(0, Math.min(prev.y, viewportHeight - rect.height))
      }));
    };
    
    constrainPosition();
    window.addEventListener('resize', constrainPosition);
    
    return () => {
      window.removeEventListener('resize', constrainPosition);
    };
  }, []);

  const handleFormatStateChange = useCallback((states: FormatStates) => {
    setFormatStates(states);
  }, []);

  const applyFormatting = useCallback((command: string) => {
    if (editorRef.current) {
      const element = editorRef.current as any;
      switch (command) {
        case 'bold':
          element.applyBold?.();
          break;
        case 'italic':
          element.applyItalic?.();
          break;
        case 'underline':
          element.applyUnderline?.();
          break;
        case 'strikethrough':
          element.applyStrikethrough?.();
          break;
        case 'bulletList':
          element.insertBulletList?.();
          break;
        case 'checkbox':
          element.insertCheckbox?.();
          break;
      }
    }
  }, []);

  if (isLoading || !activeNote) {
    return null;
  }

  return (
    <div
      ref={windowRef}
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl"
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? '300px' : '500px',
        height: isMinimized ? 'auto' : '600px',
        minWidth: '280px',
        minHeight: isMinimized ? 'auto' : '400px'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-gray-800 rounded-t-lg border-b border-gray-700 cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-white">
            {activeNote?.title || 'Notes'}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex flex-col h-full">
          {/* Toolbar */}
          <div className="border-b border-gray-700">
            <ScratchpadStreamlinedToolbar
              formatStates={formatStates}
              onFormat={applyFormatting}
            />
          </div>

          {/* Note tabs if multiple notes */}
          {notes.length > 1 && (
            <div className="flex border-b border-gray-700 bg-gray-800 overflow-x-auto">
              {notes.map(note => (
                <button
                  key={note.id}
                  onClick={() => selectNote(note.id)}
                  className={`px-3 py-2 text-xs border-r border-gray-700 truncate min-w-0 max-w-32 ${
                    note.id === activeNote?.id
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-750'
                  }`}
                >
                  {note.title}
                </button>
              ))}
              <button
                onClick={createNote}
                className="px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-750 border-r border-gray-700"
              >
                +
              </button>
            </div>
          )}

          {/* Editor */}
          <div className="flex-1 bg-gray-900 overflow-hidden">
            <ScratchpadRichTextEditor
              ref={editorRef}
              note={activeNote}
              onContentChange={updateNoteContent}
              onFormatStateChange={handleFormatStateChange}
            />
          </div>
        </div>
      )}
    </div>
  );
};