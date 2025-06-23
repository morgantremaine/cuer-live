
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { useUnifiedScratchpad } from '@/hooks/blueprint/useUnifiedScratchpad';
import ScratchpadEnhancedToolbar from './scratchpad/ScratchpadEnhancedToolbar';
import ScratchpadRichEditor from './scratchpad/ScratchpadRichEditor';
import ScratchpadEnhancedDisplay from './scratchpad/ScratchpadEnhancedDisplay';
import SaveStatus from './scratchpad/SaveStatus';

interface BlueprintScratchpadProps {
  rundownId: string;
  rundownTitle: string;
}

const BlueprintScratchpad = ({ rundownId, rundownTitle }: BlueprintScratchpadProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [mode, setMode] = useState<'text' | 'table' | 'hybrid'>('text');
  const [displayHeight, setDisplayHeight] = useState(300);
  
  const {
    notes,
    saveStatus,
    textareaRef,
    handleNotesChange,
    isLoading
  } = useUnifiedScratchpad();

  // Measure display height for consistent sizing
  React.useEffect(() => {
    if (!isEditing) {
      const displayDiv = document.querySelector('[data-scratchpad-display]') as HTMLElement;
      if (displayDiv) {
        setTimeout(() => {
          const height = displayDiv.scrollHeight;
          setDisplayHeight(Math.max(height, 300));
        }, 0);
      }
    }
  }, [notes, isEditing]);

  const handleFormatAction = (action: string, data?: any) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const element = textarea as any;
    
    switch (action) {
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
      case 'header':
        element.applyHeader?.(data);
        break;
      case 'bulletList':
        element.insertBulletList?.();
        break;
      case 'numberedList':
        element.insertNumberedList?.();
        break;
      case 'checkbox':
        element.insertCheckbox?.();
        break;
      case 'link':
        element.insertLink?.();
        break;
      case 'codeBlock':
        element.insertCodeBlock?.();
        break;
      case 'table':
        element.insertTable?.();
        break;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full mt-8 bg-gray-800 border-gray-700">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  const validSaveStatus: "error" | "saving" | "saved" = 
    saveStatus === 'error' || saveStatus === 'saving' || saveStatus === 'saved' 
      ? saveStatus 
      : 'saved';

  return (
    <Card className="w-full mt-8 bg-gray-800 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
            <CardTitle className="text-xl text-white">Enhanced Scratchpad</CardTitle>
            <SaveStatus status={validSaveStatus} />
          </div>
          <ScratchpadEnhancedToolbar
            isEditing={isEditing}
            mode={mode}
            onToggleEdit={() => setIsEditing(!isEditing)}
            onToggleMode={() => setMode(mode === 'text' ? 'table' : 'text')}
            onFormatAction={handleFormatAction}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <ScratchpadRichEditor
            content={notes}
            onChange={handleNotesChange}
            height={displayHeight}
          />
        ) : (
          <ScratchpadEnhancedDisplay
            content={notes}
            onClick={() => setIsEditing(true)}
            height={displayHeight}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default BlueprintScratchpad;
