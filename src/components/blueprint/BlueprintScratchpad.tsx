
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { useUnifiedScratchpad } from '@/hooks/blueprint/useUnifiedScratchpad';
import ScratchpadToolbar from './scratchpad/ScratchpadToolbar';
import ScratchpadContent from './scratchpad/ScratchpadContent';
import SaveStatus from './scratchpad/SaveStatus';

interface BlueprintScratchpadProps {
  rundownId: string;
  rundownTitle: string;
}

const BlueprintScratchpad = ({ rundownId, rundownTitle }: BlueprintScratchpadProps) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const {
    notes,
    saveStatus,
    textareaRef,
    handleNotesChange,
    handleBold,
    handleItalic,
    handleUnderline,
    handleBulletList,
    isLoading
  } = useUnifiedScratchpad();

  if (isLoading) {
    return (
      <Card className="w-full mt-8 bg-gray-800 border-gray-700">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mt-8 bg-gray-800 border-gray-700">
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
