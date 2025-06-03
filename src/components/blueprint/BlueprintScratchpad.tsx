
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { useScratchpadEditor } from '@/hooks/useScratchpadEditor';
import ScratchpadToolbar from './scratchpad/ScratchpadToolbar';
import ScratchpadContent from './scratchpad/ScratchpadContent';
import SaveStatus from './scratchpad/SaveStatus';

interface BlueprintScratchpadProps {
  rundownId: string;
  rundownTitle: string;
  initialNotes?: string;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, listId: string) => void;
  onDragEnterContainer?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onNotesChange?: (notes: string) => void;
}

const BlueprintScratchpad = ({ 
  rundownId, 
  rundownTitle, 
  initialNotes = '', 
  isDragging = false,
  onDragStart,
  onDragEnterContainer,
  onDragEnd,
  onNotesChange 
}: BlueprintScratchpadProps) => {
  const {
    notes,
    isEditing,
    saveStatus,
    textareaRef,
    setIsEditing,
    handleNotesChange,
    handleBold,
    handleItalic,
    handleUnderline,
    handleBulletList
  } = useScratchpadEditor(rundownId, rundownTitle, initialNotes, onNotesChange);

  return (
    <Card 
      className={`w-full bg-gray-800 border-gray-700 ${isDragging ? 'opacity-50' : ''}`}
      draggable
      onDragStart={(e) => onDragStart?.(e, 'scratchpad')}
      onDragEnter={onDragEnterContainer}
      onDragEnd={onDragEnd}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
            <CardTitle className="text-xl text-white">Show Scratchpad</CardTitle>
            <SaveStatus status={saveStatus} />
          </div>
          <ScratchpadToolbar
            isEditing={isEditing}
            onToggleEdit={() => setIsEditing(!isEditing)}
            onBold={handleBold}
            onItalic={handleItalic}
            onUnderline={handleUnderline}
            onBulletList={handleBulletList}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ScratchpadContent
          notes={notes}
          isEditing={isEditing}
          textareaRef={textareaRef}
          onNotesChange={handleNotesChange}
          onStartEditing={() => setIsEditing(true)}
        />
      </CardContent>
    </Card>
  );
};

export default BlueprintScratchpad;
