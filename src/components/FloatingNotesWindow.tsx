import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUnifiedNotes } from '@/hooks/useUnifiedNotes';
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
  const [size, setSize] = useState({ width: 500, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState('');
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [formatStates, setFormatStates] = useState<FormatStates>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false
  });

  // Use the unified notes system for consistency with blueprint
  const {
    notes,
    activeNote,
    isLoading,
    createNote,
    selectNote,
    updateNoteContent,
    renameNote,
    deleteNote,
    reorderNotes
  } = useUnifiedNotes(rundownId);

  // Mouse event handlers for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!windowRef.current || isResizing) return;
    
    const rect = windowRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  }, [isResizing]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && !isResizing) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStartPos.x;
      const deltaY = e.clientY - resizeStartPos.y;
      
      // Only bottom-right resizing - expand width and height
      const newWidth = Math.max(280, resizeStartSize.width + deltaX);
      const newHeight = Math.max(300, resizeStartSize.height + deltaY);

      setSize({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dragOffset, resizeStartPos, resizeStartSize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle('');
  }, []);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setResizeStartSize({ width: size.width, height: size.height });
  }, [size]);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

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
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden select-none"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        minWidth: '280px',
        minHeight: '300px'
      }}
    >
      {/* Resize handle - bottom right corner only */}
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize bg-gray-600 rounded-tl-sm opacity-50 hover:opacity-75"
        onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
      >
        <div className="absolute bottom-0.5 right-0.5 w-2 h-2">
          <div className="w-full h-0.5 bg-gray-400 mb-0.5"></div>
          <div className="w-full h-0.5 bg-gray-400"></div>
        </div>
      </div>

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
          <span className="text-xs text-gray-400 ml-2">
            - manage notes on blueprints page
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
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
      <div className="flex flex-col" style={{ height: 'calc(100% - 60px)' }}>
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
            {notes.map((note, index) => (
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
        <div className="flex-1 overflow-auto">
          <ScratchpadRichTextEditor
            ref={editorRef}
            note={activeNote}
            onContentChange={updateNoteContent}
            onFormatStateChange={handleFormatStateChange}
          />
        </div>
      </div>
    </div>
  );
};